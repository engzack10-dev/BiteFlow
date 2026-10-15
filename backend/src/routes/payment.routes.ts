import { Router, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.js'
import { Payment, IPayment } from '../models/Payment.js'
import { Order } from '../models/Order.js'

export const paymentRouter = Router()

/**
 * Generate human-readable unique payment number
 */
function generatePaymentNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(1000 + Math.random() * 9000)
  return `PAY-${timestamp}-${random}`
}

export const submitPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentMethod: z
    .string()
    .trim()
    .max(100, 'Payment method description cannot exceed 100 characters')
    .optional()
    .default('MANUAL_VERIFICATION'),
  customerNote: z
    .string()
    .trim()
    .max(300, 'Customer note cannot exceed 300 characters')
    .optional()
    .default(''),
})

export const rejectPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Rejection reason must be at least 3 characters')
    .max(300, 'Rejection reason cannot exceed 300 characters'),
})

// ============================================================================
// CUSTOMER PAYMENT ROUTES
// ============================================================================

/**
 * POST /api/payments
 * Customer submits payment step for an existing eligible order.
 * Strictly verifies ownership, derives amount from persisted order,
 * sets status to PENDING, records audit event, and keeps order in PENDING_PAYMENT.
 */
paymentRouter.post(
  '/',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId

    const parseResult = submitPaymentSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid payment submission payload',
        details: parseResult.error.format(),
      })
      return
    }

    const { orderId, paymentMethod, customerNote } = parseResult.data

    try {
      // 1. Resolve order by _id or orderNumber
      const orderQuery = mongoose.Types.ObjectId.isValid(orderId)
        ? { _id: orderId }
        : { orderNumber: orderId }

      const order = await Order.findOne(orderQuery)
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }

      // 2. Ownership verification
      if (order.clerkId !== clerkId) {
        res.status(403).json({
          error: 'Forbidden: You cannot submit payment for another customer\'s order',
        })
        return
      }

      // 3. Order eligibility check: cannot submit payment if already confirmed or paid
      if (order.status !== 'PENDING_PAYMENT' || order.paymentStatus === 'VERIFIED') {
        res.status(409).json({
          error: 'Payment for this order has already been verified and confirmed',
          currentStatus: order.status,
          paymentStatus: order.paymentStatus,
        })
        return
      }

      // 4. Concurrency & Idempotency guard:
      // If a PENDING payment already exists for this order, return it safely without creating duplicate records.
      const existingPending = await Payment.findOne({
        orderId: order._id,
        status: 'PENDING',
      })

      if (existingPending) {
        res.status(200).json({
          success: true,
          message: 'Payment submission is already recorded and awaiting Admin verification',
          payment: existingPending,
          order: {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
          },
        })
        return
      }

      // 5. Create new Payment record with PENDING status
      let paymentNumber = generatePaymentNumber()
      const existingNum = await Payment.findOne({ paymentNumber })
      if (existingNum) {
        paymentNumber = generatePaymentNumber()
      }

      const payment = await Payment.create({
        paymentNumber,
        orderId: order._id,
        orderNumber: order.orderNumber,
        clerkId,
        customerName: order.customerName,
        customerEmail: order.customerEmail || '',
        amount: order.totalAmount, // Trusted authoritative order total
        currency: 'USD',
        status: 'PENDING',
        paymentMethod: paymentMethod || 'MANUAL_VERIFICATION',
        customerNote: customerNote || '',
        submittedAt: new Date(),
        auditHistory: [
          {
            action: 'SUBMITTED',
            previousStatus: null,
            newStatus: 'PENDING',
            actorId: clerkId,
            actorRole: 'customer',
            actorEmail: order.customerEmail || '',
            timestamp: new Date(),
            note: customerNote || 'Customer submitted manual payment step',
          },
        ],
      })

      // Link payment to order, order remains PENDING_PAYMENT
      order.paymentId = payment._id as mongoose.Types.ObjectId
      order.paymentStatus = 'PENDING'
      await order.save()

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully. Manual payment verification is pending.',
        payment,
        order: {
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
        },
      })
    } catch (error: any) {
      console.error('[POST /api/payments] Error:', error)
      res.status(500).json({ error: error.message || 'Failed to submit payment' })
    }
  }
)

/**
 * GET /api/payments/my-payments
 * Customer retrieves their own payment records.
 */
paymentRouter.get(
  '/my-payments',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId

    try {
      const payments = await Payment.find({ clerkId }).sort({ createdAt: -1 }).lean()
      res.json({
        success: true,
        payments,
      })
    } catch (error: any) {
      console.error('[GET /api/payments/my-payments] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve payments' })
    }
  }
)

/**
 * GET /api/payments/order/:orderId
 * Retrieves payment associated with a specific order.
 * Customer must own the order, or caller must be admin.
 */
paymentRouter.get(
  '/order/:orderId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId
    const rawOrderId = req.params.orderId
    const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId

    try {
      const orderQuery = mongoose.Types.ObjectId.isValid(orderId)
        ? { _id: orderId }
        : { orderNumber: orderId }

      const order = await Order.findOne(orderQuery).lean()
      if (!order) {
        res.status(404).json({ error: 'Order not found' })
        return
      }

      // Check ownership or admin role
      const isOwner = order.clerkId === clerkId
      if (!isOwner) {
        // Check if user is admin
        const { User } = await import('../models/User.js')
        const user = await User.findOne({ clerkId })
        if (!user || user.role !== 'admin') {
          res.status(403).json({ error: 'Forbidden: You do not own this order' })
          return
        }
      }

      const payment = await Payment.findOne({ orderId: order._id }).sort({ createdAt: -1 }).lean()
      res.json({
        success: true,
        payment: payment || null,
        order: {
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          deliveryArea: order.deliveryArea,
          paymentRejectionReason: order.paymentRejectionReason,
        },
      })
    } catch (error: any) {
      console.error('[GET /api/payments/order/:orderId] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve order payment' })
    }
  }
)

// ============================================================================
// ADMIN PAYMENT QUEUE & VERIFICATION ROUTES (requireRole: admin)
// ============================================================================

/**
 * GET /api/payments
 * Admin lists payments queue with optional status filter.
 */
paymentRouter.get(
  '/',
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query
      const filter: Record<string, any> = {}

      if (status && ['PENDING', 'VERIFIED', 'REJECTED'].includes(status as string)) {
        filter.status = status
      }

      const payments = await Payment.find(filter)
        .populate('orderId', 'orderNumber customerName customerPhone deliveryAddress deliveryArea items totalAmount status paymentStatus')
        .sort({ createdAt: -1 })
        .lean()

      const pendingCount = await Payment.countDocuments({ status: 'PENDING' })
      const verifiedCount = await Payment.countDocuments({ status: 'VERIFIED' })
      const rejectedCount = await Payment.countDocuments({ status: 'REJECTED' })

      res.json({
        success: true,
        counts: {
          pending: pendingCount,
          verified: verifiedCount,
          rejected: rejectedCount,
          total: payments.length,
        },
        payments,
      })
    } catch (error: any) {
      console.error('[GET /api/payments] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve payment queue' })
    }
  }
)

/**
 * GET /api/payments/:id
 * Admin (or customer owner) views full payment details and complete audit history.
 */
paymentRouter.get(
  '/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const clerkId = req.auth!.userId
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId

    try {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { paymentNumber: id }

      const payment = await Payment.findOne(query).lean()
      if (!payment) {
        res.status(404).json({ error: 'Payment record not found' })
        return
      }

      // Check ownership or admin role
      if (payment.clerkId !== clerkId) {
        const { User } = await import('../models/User.js')
        const user = await User.findOne({ clerkId })
        if (!user || user.role !== 'admin') {
          res.status(403).json({ error: 'Forbidden: Insufficient privileges' })
          return
        }
      }

      const order = await Order.findById(payment.orderId).lean()

      res.json({
        success: true,
        payment,
        order,
      })
    } catch (error: any) {
      console.error('[GET /api/payments/:id] Error:', error)
      res.status(500).json({ error: 'Failed to retrieve payment details' })
    }
  }
)

/**
 * POST /api/payments/:id/verify
 * Admin verifies payment:
 * - Checks status is PENDING.
 * - Transitions payment to VERIFIED.
 * - Transitions associated order to CONFIRMED.
 * - Records Admin identity, timestamp, and audit event.
 * - Rejects double verification or verification of rejected payments.
 */
paymentRouter.post(
  '/:id/verify',
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminUser = req.user!
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId

    try {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { paymentNumber: id }

      const payment = await Payment.findOne(query)
      if (!payment) {
        res.status(404).json({ error: 'Payment record not found' })
        return
      }

      // Invariant: Already verified
      if (payment.status === 'VERIFIED') {
        res.status(409).json({
          error: 'Conflict: This payment has already been verified',
          verifiedAt: payment.verifiedAt,
          verifiedBy: payment.verifiedBy,
        })
        return
      }

      // Invariant: Cannot verify a rejected payment
      if (payment.status === 'REJECTED') {
        res.status(409).json({
          error: 'Conflict: Cannot verify a rejected payment. A rejected payment must not be converted directly to verified.',
          rejectedAt: payment.rejectedAt,
          rejectionReason: payment.rejectionReason,
        })
        return
      }

      if (payment.status !== 'PENDING') {
        res.status(400).json({ error: `Cannot verify payment with status "${payment.status}"` })
        return
      }

      const order = await Order.findById(payment.orderId)
      if (!order) {
        res.status(404).json({ error: 'Associated order not found' })
        return
      }

      // Perform atomic status transitions
      const now = new Date()
      const adminEmail = adminUser.email || adminUser.clerkId

      payment.status = 'VERIFIED'
      payment.verifiedAt = now
      payment.verifiedBy = adminEmail
      payment.auditHistory.push({
        action: 'VERIFIED',
        previousStatus: 'PENDING',
        newStatus: 'VERIFIED',
        actorId: adminUser.clerkId,
        actorRole: 'admin',
        actorEmail: adminEmail,
        timestamp: now,
        note: 'Admin confirmed receipt of payment in bank account / notification',
      })

      order.paymentStatus = 'VERIFIED'
      order.status = 'CONFIRMED' // Kitchen prep eligible only now!
      order.paymentId = payment._id as mongoose.Types.ObjectId
      if (!order.statusHistory) {
        order.statusHistory = []
      }
      order.statusHistory.push({
        previousStatus: 'PENDING_PAYMENT',
        newStatus: 'CONFIRMED',
        timestamp: now,
        actorId: adminUser.clerkId,
        actorRole: 'admin',
        actorEmail: adminEmail,
        note: 'Payment verified by Admin',
      })

      await payment.save()
      await order.save()

      res.json({
        success: true,
        message: 'Payment verified successfully. Order is now CONFIRMED.',
        payment: {
          id: payment._id.toString(),
          paymentNumber: payment.paymentNumber,
          status: payment.status,
          amount: payment.amount,
          verifiedAt: payment.verifiedAt,
          verifiedBy: payment.verifiedBy,
          auditHistory: payment.auditHistory,
        },
        order: {
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
        },
      })
    } catch (error: any) {
      console.error('[POST /api/payments/:id/verify] Error:', error)
      res.status(500).json({ error: error.message || 'Failed to verify payment' })
    }
  }
)

/**
 * POST /api/payments/:id/reject
 * Admin rejects payment:
 * - Checks status is PENDING.
 * - Requires non-empty rejection reason.
 * - Transitions payment to REJECTED.
 * - Records Admin identity, timestamp, rejection reason, and audit event.
 * - Associated order remains PENDING_PAYMENT with paymentStatus: REJECTED.
 * - Order is NOT confirmed and cannot enter preparation.
 */
paymentRouter.post(
  '/:id/reject',
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const adminUser = req.user!
    const rawId = req.params.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId

    const parseResult = rejectPaymentSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid rejection payload',
        details: parseResult.error.format(),
      })
      return
    }

    const { reason } = parseResult.data

    try {
      const query = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { paymentNumber: id }

      const payment = await Payment.findOne(query)
      if (!payment) {
        res.status(404).json({ error: 'Payment record not found' })
        return
      }

      // Invariant: Cannot reject an already verified payment
      if (payment.status === 'VERIFIED') {
        res.status(409).json({
          error: 'Conflict: Cannot reject an already verified payment',
          verifiedAt: payment.verifiedAt,
          verifiedBy: payment.verifiedBy,
        })
        return
      }

      // Invariant: Already rejected
      if (payment.status === 'REJECTED') {
        res.status(409).json({
          error: 'Conflict: This payment has already been rejected',
          rejectedAt: payment.rejectedAt,
          rejectionReason: payment.rejectionReason,
        })
        return
      }

      if (payment.status !== 'PENDING') {
        res.status(400).json({ error: `Cannot reject payment with status "${payment.status}"` })
        return
      }

      const order = await Order.findById(payment.orderId)
      if (!order) {
        res.status(404).json({ error: 'Associated order not found' })
        return
      }

      // Invariant: Order must not already be confirmed or in preparation
      if (['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'].includes(order.status)) {
        res.status(409).json({
          error: `Cannot reject payment: associated order is already in status "${order.status}"`,
        })
        return
      }

      const now = new Date()
      const adminEmail = adminUser.email || adminUser.clerkId

      payment.status = 'REJECTED'
      payment.rejectedAt = now
      payment.rejectedBy = adminEmail
      payment.rejectionReason = reason
      payment.auditHistory.push({
        action: 'REJECTED',
        previousStatus: 'PENDING',
        newStatus: 'REJECTED',
        actorId: adminUser.clerkId,
        actorRole: 'admin',
        actorEmail: adminEmail,
        timestamp: now,
        note: reason,
      })

      // Update order: remains PENDING_PAYMENT, paymentStatus becomes REJECTED
      order.paymentStatus = 'REJECTED'
      order.paymentRejectionReason = reason

      await payment.save()
      await order.save()

      res.json({
        success: true,
        message: 'Payment rejected. Order remains pending payment and cannot enter preparation.',
        payment: {
          id: payment._id.toString(),
          paymentNumber: payment.paymentNumber,
          status: payment.status,
          rejectionReason: payment.rejectionReason,
          rejectedAt: payment.rejectedAt,
          rejectedBy: payment.rejectedBy,
          auditHistory: payment.auditHistory,
        },
        order: {
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentRejectionReason: order.paymentRejectionReason,
        },
      })
    } catch (error: any) {
      console.error('[POST /api/payments/:id/reject] Error:', error)
      res.status(500).json({ error: error.message || 'Failed to reject payment' })
    }
  }
)
