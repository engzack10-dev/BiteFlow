import { Router, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js'
import { Product } from '../models/Product.js'
import { Order, IOrderItem, OrderStatus } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { RestaurantSettings } from '../models/RestaurantSettings.js'

export const orderRouter = Router()

// All order endpoints require Clerk authentication
orderRouter.use(requireAuth)

/**
 * Delivery information validation schema
 */
export const deliverySchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, 'Recipient name must be at least 2 characters')
    .max(100, 'Recipient name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .min(7, 'Contact phone number must be at least 7 characters')
    .max(25, 'Contact phone number cannot exceed 25 characters')
    .regex(
      /^[+]?[\d\s\-()]{7,25}$/,
      'Contact phone number must be a valid format (e.g., +1 555-0199 or 9876543210)'
    ),
  deliveryAddress: z
    .string()
    .trim()
    .min(5, 'Delivery address must be at least 5 characters')
    .max(250, 'Delivery address cannot exceed 250 characters'),
  deliveryArea: z
    .string()
    .trim()
    .min(2, 'Delivery area/district must be at least 2 characters')
    .max(100, 'Delivery area cannot exceed 100 characters'),
  deliveryInstructions: z
    .string()
    .trim()
    .max(300, 'Delivery instructions cannot exceed 300 characters')
    .optional()
    .default(''),
})

/**
 * Item input schema (client sends product identifier and quantity)
 */
export const orderItemInputSchema = z.object({
  id: z.string().min(1, 'Product identifier is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(99, 'Quantity cannot exceed 99 units'),
  // Client-supplied name/unitPrice are accepted but strictly ignored for price calculations
  name: z.string().optional(),
  unitPrice: z.number().optional(),
})

export const reviewOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
})

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  delivery: deliverySchema,
  reviewedTotalAmount: z.number().optional(),
})

/**
 * Strict centralized order lifecycle state machine (FS-07)
 */
export const ALLOWED_NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED'],
  CONFIRMED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
}

/**
 * Helper to validate and parse date range filters with timezone safety and end-of-day handling.
 */
export function parseDateFilter(
  startDateStr?: string,
  endDateStr?: string
): { dateFilter?: { $gte?: Date; $lte?: Date }; error?: string } {
  if (!startDateStr && !endDateStr) {
    return {}
  }

  let start: Date | undefined
  let end: Date | undefined

  if (startDateStr) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
      start = new Date(`${startDateStr}T00:00:00.000Z`)
    } else {
      start = new Date(startDateStr)
    }
    if (isNaN(start.getTime())) {
      return { error: 'Invalid startDate format: must be valid date (e.g. YYYY-MM-DD or ISO)' }
    }
  }

  if (endDateStr) {
    // If YYYY-MM-DD format, set to end-of-day 23:59:59.999Z so orders throughout that day are included
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      end = new Date(`${endDateStr}T23:59:59.999Z`)
    } else {
      end = new Date(endDateStr)
    }
    if (isNaN(end.getTime())) {
      return { error: 'Invalid endDate format: must be valid date (e.g. YYYY-MM-DD or ISO)' }
    }
  }

  if (start && end && end.getTime() < start.getTime()) {
    return { error: 'Invalid date range: endDate cannot be earlier than startDate' }
  }

  const dateFilter: { $gte?: Date; $lte?: Date } = {}
  if (start) dateFilter.$gte = start
  if (end) dateFilter.$lte = end

  return { dateFilter }
}

/**
 * Helper to generate human-readable unique order number
 */
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(1000 + Math.random() * 9000)
  return `ORD-${timestamp}-${random}`
}

/**
 * Helper to calculate verified items and server-authoritative totals from database
 */
async function verifyProductsAndCalculate(
  items: Array<{ id: string; quantity: number }>
): Promise<{
  verifiedItems: IOrderItem[]
  subtotal: number
  deliveryFee: number
  totalAmount: number
}> {
  const verifiedItems: IOrderItem[] = []
  let subtotalCents = 0

  for (const item of items) {
    let dbProduct = null

    if (mongoose.Types.ObjectId.isValid(item.id)) {
      dbProduct = await Product.findById(item.id)
    } else {
      // Fallback search by name if legacy ID was supplied
      dbProduct = await Product.findOne({ name: item.id })
    }

    if (!dbProduct) {
      const err = new Error(`Product with ID "${item.id}" was not found in restaurant inventory`)
      ;(err as any).statusCode = 400
      ;(err as any).productId = item.id
      throw err
    }

    // Availability validation (FS-02 & FS-05 rule)
    if (!dbProduct.isAvailable) {
      const err = new Error(
        `Cannot purchase "${dbProduct.name}": This item is currently unavailable.`
      )
      ;(err as any).statusCode = 400
      ;(err as any).unavailableProductId = dbProduct._id
      throw err
    }

    const unitPrice = dbProduct.price
    const itemSubtotalCents = Math.round(unitPrice * 100) * item.quantity
    subtotalCents += itemSubtotalCents

    verifiedItems.push({
      productId: dbProduct._id as mongoose.Types.ObjectId,
      name: dbProduct.name,
      image: dbProduct.image || '/delicious-burger.jpg',
      unitPrice,
      quantity: item.quantity,
      subtotal: Math.round(itemSubtotalCents) / 100,
    })
  }

  const subtotal = Math.round(subtotalCents) / 100
  // BiteFlow has 0 delivery fee configured
  const deliveryFee = 0
  const totalAmount = Math.round((subtotalCents + deliveryFee * 100)) / 100

  return {
    verifiedItems,
    subtotal,
    deliveryFee,
    totalAmount,
  }
}

/**
 * POST /api/orders/review
 * Protected customer route: validates cart items and returns authoritative server-calculated pricing.
 * Customer must review this total before submitting an order.
 */
orderRouter.post(
  '/review',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parseResult = reviewOrderSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid order review payload',
        details: parseResult.error.format(),
      })
      return
    }

    try {
      const calculation = await verifyProductsAndCalculate(parseResult.data.items)
      res.json({
        success: true,
        items: calculation.verifiedItems,
        subtotal: calculation.subtotal,
        deliveryFee: calculation.deliveryFee,
        totalAmount: calculation.totalAmount,
      })
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Error reviewing order',
        unavailableProductId: error.unavailableProductId,
      })
    }
  }
)

/**
 * GET /api/orders
 * Admin route: lists orders with optional status filter, date range filter, and text search.
 * Returns aggregate counts by status and filtered orders.
 */
orderRouter.get(
  '/',
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status, startDate, endDate, search } = req.query

      const dateResult = parseDateFilter(
        startDate as string | undefined,
        endDate as string | undefined
      )
      if (dateResult.error) {
        res.status(400).json({ error: dateResult.error })
        return
      }

      const filter: Record<string, any> = {}

      if (dateResult.dateFilter) {
        filter.createdAt = dateResult.dateFilter
      }

      if (status && status !== 'ALL') {
        filter.status = status
      }

      if (search && typeof search === 'string' && search.trim()) {
        const term = search.trim()
        const regex = new RegExp(term, 'i')
        filter.$or = [
          { orderNumber: regex },
          { customerName: regex },
          { customerPhone: regex },
        ]
      }

      const orders = await Order.find(filter)
        .populate('paymentId', 'paymentNumber status amount currency submittedAt verifiedAt verifiedBy rejectedAt rejectionReason')
        .sort({ createdAt: -1 })
        .lean()

      const pendingPayment = await Order.countDocuments({ status: 'PENDING_PAYMENT' })
      const confirmed = await Order.countDocuments({ status: 'CONFIRMED' })
      const preparing = await Order.countDocuments({ status: 'PREPARING' })
      const ready = await Order.countDocuments({ status: 'READY' })
      const dispatched = await Order.countDocuments({ status: 'DISPATCHED' })
      const delivered = await Order.countDocuments({ status: 'DELIVERED' })
      const active = await Order.countDocuments({ status: { $in: ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED'] } })
      const total = await Order.countDocuments()

      res.json({
        success: true,
        counts: {
          pendingPayment,
          confirmed,
          preparing,
          ready,
          dispatched,
          delivered,
          active,
          total,
        },
        orders,
      })
    } catch (error: any) {
      console.error('[GET /api/orders] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve orders' })
    }
  }
)

/**
 * GET /api/orders/my-orders
 * Protected customer route: returns ONLY orders belonging to authenticated user from MongoDB.
 */
orderRouter.get(
  '/my-orders',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId

    try {
      const orders = await Order.find({ clerkId })
        .populate('paymentId', 'paymentNumber status amount currency submittedAt verifiedAt verifiedBy rejectedAt rejectionReason')
        .sort({ createdAt: -1 })
        .lean()
      res.json({
        success: true,
        orders,
      })
    } catch (error: any) {
      console.error('[GET /my-orders] Error fetching orders:', error)
      res.status(500).json({ error: 'Failed to retrieve order history' })
    }
  }
)

/**
 * GET /api/orders/:id
 * Protected route: retrieves single order by Mongo _id or orderNumber with populated payment and status history.
 */
orderRouter.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId

    try {
      const dbUser = await User.findOne({ clerkId })
      const isAdmin = dbUser?.role === 'admin'

      const identifierFilter = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { orderNumber: id }

      // Apply ownership filtering directly in the database query for customers to prevent leaking order existence
      const query = isAdmin ? identifierFilter : { ...identifierFilter, clerkId }

      const order = await Order.findOne(query)
        .populate('paymentId', 'paymentNumber status amount currency submittedAt verifiedAt verifiedBy rejectedAt rejectionReason')
        .lean()
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }

      res.json({
        success: true,
        order,
      })
    } catch (error: any) {
      console.error('[GET /orders/:id] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve order' })
    }
  }
)

/**
 * POST /api/orders
 * Protected customer route: creates order tied directly to req.auth.userId in MongoDB.
 * Enforces authoritative server-calculated pricing, product existence, availability,
 * and delivery information validation.
 */
orderRouter.post(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId

    const parseResult = createOrderSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid order submission payload',
        details: parseResult.error.format(),
      })
      return
    }

    const { items, delivery, reviewedTotalAmount } = parseResult.data

    try {
      // 0. Enforce restaurant operational availability from persisted settings
      const settings = await RestaurantSettings.findOne()
      if (settings?.restaurantStatus === 'CLOSED') {
        res.status(400).json({
          error: 'Orders are currently paused: BiteFlow is closed.',
        })
        return
      }
      if (settings && settings.isDeliveryActive === false) {
        res.status(400).json({
          error: 'Delivery service is currently inactive. Please check back later.',
        })
        return
      }

      // Duplicate submission guard (rapid retry idempotency within 15 seconds)
      const fifteenSecondsAgo = new Date(Date.now() - 15000)
      const duplicateRecentOrder = await Order.findOne({
        clerkId,
        status: 'PENDING_PAYMENT',
        customerName: delivery.recipientName,
        customerPhone: delivery.phone,
        deliveryAddress: delivery.deliveryAddress,
        createdAt: { $gte: fifteenSecondsAgo },
      }).populate('paymentId')

      if (duplicateRecentOrder) {
        res.status(200).json({
          success: true,
          message: 'Order already received and recorded.',
          order: {
            id: duplicateRecentOrder._id.toString(),
            orderNumber: duplicateRecentOrder.orderNumber,
            clerkId: duplicateRecentOrder.clerkId,
            customerName: duplicateRecentOrder.customerName,
            customerPhone: duplicateRecentOrder.customerPhone,
            deliveryAddress: duplicateRecentOrder.deliveryAddress,
            deliveryArea: duplicateRecentOrder.deliveryArea,
            items: duplicateRecentOrder.items,
            subtotal: duplicateRecentOrder.subtotal,
            deliveryFee: duplicateRecentOrder.deliveryFee,
            totalAmount: duplicateRecentOrder.totalAmount,
            status: duplicateRecentOrder.status,
            paymentStatus: duplicateRecentOrder.paymentStatus,
            paymentId: duplicateRecentOrder.paymentId,
            createdAt: duplicateRecentOrder.createdAt,
          },
        })
        return
      }

      // 1. Authoritative server-side availability and price verification
      const calculation = await verifyProductsAndCalculate(items)

      // 2. Price change guard: if client submitted the reviewedTotalAmount and it doesn't match
      if (
        reviewedTotalAmount !== undefined &&
        Math.abs(calculation.totalAmount - reviewedTotalAmount) > 0.009
      ) {
        res.status(409).json({
          error:
            'Price change detected: One or more item prices have changed since you reviewed your order. Please review the updated total before confirming.',
          code: 'PRICE_CHANGED',
          updatedTotal: calculation.totalAmount,
          reviewedTotal: reviewedTotalAmount,
        })
        return
      }

      // 3. Resolve customer email if available
      let customerEmail = ''
      try {
        const userDoc = await User.findOne({ clerkId })
        if (userDoc?.email) {
          customerEmail = userDoc.email
        }
      } catch {
        // Fallback silently if lookup fails
      }

      // 4. Generate unique orderNumber
      let orderNumber = generateOrderNumber()
      // Guard against rare collision
      const existing = await Order.findOne({ orderNumber })
      if (existing) {
        orderNumber = generateOrderNumber()
      }

      // 5. Persist order in MongoDB
      const createdOrder = await Order.create({
        orderNumber,
        clerkId,
        customerName: delivery.recipientName,
        customerEmail,
        customerPhone: delivery.phone,
        deliveryAddress: delivery.deliveryAddress,
        deliveryArea: delivery.deliveryArea,
        deliveryInstructions: delivery.deliveryInstructions || '',
        items: calculation.verifiedItems,
        subtotal: calculation.subtotal,
        deliveryFee: calculation.deliveryFee,
        totalAmount: calculation.totalAmount,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        statusHistory: [
          {
            previousStatus: null,
            newStatus: 'PENDING_PAYMENT',
            timestamp: new Date(),
            actorId: clerkId,
            actorRole: 'system',
            actorEmail: customerEmail,
            note: 'Order placed by customer at checkout',
          },
        ],
      })

      // Create linked initial Payment record with PENDING status and audit record
      const paymentNumber = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`
      const initialPayment = await Payment.create({
        paymentNumber,
        orderId: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        clerkId,
        customerName: delivery.recipientName,
        customerEmail,
        amount: calculation.totalAmount,
        currency: 'USD',
        status: 'PENDING',
        paymentMethod: 'MANUAL_VERIFICATION',
        submittedAt: new Date(),
        auditHistory: [
          {
            action: 'SUBMITTED',
            previousStatus: null,
            newStatus: 'PENDING',
            actorId: clerkId,
            actorRole: 'customer',
            actorEmail: customerEmail,
            timestamp: new Date(),
            note: 'Initial payment step submitted at checkout',
          },
        ],
      })

      createdOrder.paymentId = initialPayment._id as mongoose.Types.ObjectId
      await createdOrder.save()

      res.status(201).json({
        success: true,
        message: 'Order created successfully. Manual payment verification is pending.',
        order: {
          id: createdOrder._id.toString(),
          orderNumber: createdOrder.orderNumber,
          clerkId: createdOrder.clerkId,
          customerName: createdOrder.customerName,
          customerPhone: createdOrder.customerPhone,
          deliveryAddress: createdOrder.deliveryAddress,
          deliveryArea: createdOrder.deliveryArea,
          deliveryInstructions: createdOrder.deliveryInstructions,
          items: createdOrder.items,
          subtotal: createdOrder.subtotal,
          deliveryFee: createdOrder.deliveryFee,
          totalAmount: createdOrder.totalAmount,
          status: createdOrder.status,
          paymentStatus: createdOrder.paymentStatus,
          paymentId: initialPayment._id.toString(),
          paymentNumber: initialPayment.paymentNumber,
          createdAt: createdOrder.createdAt.toISOString(),
        },
      })
    } catch (error: any) {
      console.error('[POST /api/orders] Order creation error:', error)
      res.status(error.statusCode || 500).json({
        error: error.message || 'Failed to create order',
        unavailableProductId: error.unavailableProductId,
      })
    }
  }
)

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED']),
  note: z.string().trim().max(300).optional(),
})

/**
 * PATCH /api/orders/:id/status
 * Admin route to update order status enforcing the complete FS-07 Order Lifecycle State Machine:
 * - Rejects arbitrary, skipped, or backward transitions.
 * - Rejects transitions without verified payment.
 * - Rejects duplicate transition to current status.
 * - Records fulfillment timestamps (dispatchedAt, deliveredAt).
 * - Appends immutable status history audit event.
 */
orderRouter.patch(
  '/:id/status',
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    const adminUser = req.user!

    const parseResult = updateOrderStatusSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid order status payload',
        details: parseResult.error.format(),
      })
      return
    }

    const { status: targetStatus, note } = parseResult.data

    try {
      // 1. Resolve order
      const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { orderNumber: id }
      const order = await Order.findOne(query).populate('paymentId')
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }

      const currentStatus = order.status

      // 2. Reject duplicate transition (noop)
      if (currentStatus === targetStatus) {
        res.status(400).json({
          error: `Order is already in status "${currentStatus}". Duplicate transition rejected.`,
          currentStatus,
        })
        return
      }

      // 3. Strict State Machine Validation:
      // PENDING_PAYMENT -> CONFIRMED
      // CONFIRMED -> PREPARING
      // PREPARING -> READY
      // READY -> DISPATCHED
      // DISPATCHED -> DELIVERED
      const allowedNext = ALLOWED_NEXT_STATUSES[currentStatus] || []
      if (!allowedNext.includes(targetStatus)) {
        res.status(400).json({
          error: `Invalid status transition: Cannot transition order from "${currentStatus}" to "${targetStatus}". Allowed next status: ${
            allowedNext.join(', ') || 'None (order is in final status DELIVERED)'
          }.`,
          currentStatus,
          targetStatus,
          allowedNext,
        })
        return
      }

      // 4. KITCHEN SAFETY & PAYMENT VERIFICATION ENFORCEMENT:
      if (currentStatus === 'PENDING_PAYMENT' && targetStatus === 'CONFIRMED' && order.paymentStatus !== 'VERIFIED') {
        res.status(400).json({
          error: 'Orders cannot be manually confirmed without payment verification. Transition to CONFIRMED is only permitted through the verified payment workflow (FS-06).',
          currentStatus,
          paymentStatus: order.paymentStatus,
        })
        return
      }

      const requiresVerifiedPayment = ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'].includes(targetStatus)
      if (requiresVerifiedPayment && order.paymentStatus !== 'VERIFIED') {
        res.status(400).json({
          error: `Cannot update order status to "${targetStatus}": Kitchen preparation and delivery require a VERIFIED payment. Current payment status is "${order.paymentStatus}". Kitchen safety rule enforced.`,
          currentStatus,
          paymentStatus: order.paymentStatus,
        })
        return
      }

      const now = new Date()
      const adminEmail = adminUser.email || adminUser.clerkId

      // 5. Fulfillment updates & atomic conditional update
      const updateFields: Record<string, any> = {
        status: targetStatus,
      }
      if (targetStatus === 'DISPATCHED') {
        updateFields.dispatchedAt = now
        updateFields.dispatchedBy = adminEmail
      } else if (targetStatus === 'DELIVERED') {
        updateFields.deliveredAt = now
        updateFields.deliveredBy = adminEmail
      }

      const historyEntry = {
        previousStatus: currentStatus,
        newStatus: targetStatus,
        timestamp: now,
        actorId: adminUser.clerkId,
        actorRole: 'admin',
        actorEmail: adminEmail,
        note: note || `Order transitioned from ${currentStatus} to ${targetStatus}`,
      }

      // Safe atomic conditional update preventing concurrent update race conditions
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: currentStatus, // Concurrency guard: status must match pre-check
        },
        {
          $set: updateFields,
          $push: { statusHistory: historyEntry },
        },
        { new: true }
      ).populate('paymentId')

      if (!updatedOrder) {
        res.status(409).json({
          error: 'Conflict: Order status was modified concurrently by another administrator. Please refresh and retry.',
        })
        return
      }

      res.json({
        success: true,
        message: `Order status successfully updated to ${targetStatus}`,
        order: {
          id: updatedOrder._id.toString(),
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.customerName,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          dispatchedAt: updatedOrder.dispatchedAt,
          deliveredAt: updatedOrder.deliveredAt,
          statusHistory: updatedOrder.statusHistory,
        },
      })
    } catch (error: any) {
      console.error('[PATCH /api/orders/:id/status] Error:', error)
      res.status(500).json({ error: error.message || 'Failed to update order status' })
    }
  }
)
