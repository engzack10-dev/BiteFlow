import mongoose from 'mongoose'
import { Router, Response } from 'express'
import { z } from 'zod'
import { requireRole, AuthenticatedRequest } from '../middleware/auth.js'
import { User, UserRole } from '../models/User.js'
import { Payment } from '../models/Payment.js'
import { Order, OrderStatus } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Feedback, FeedbackStatus } from '../models/Feedback.js'
import { RestaurantSettings, RestaurantOperationalStatus } from '../models/RestaurantSettings.js'
import { parseDateFilter } from './order.routes.js'

export const adminRouter = Router()

// All routes in adminRouter strictly require the 'admin' role server-side
adminRouter.use(requireRole(['admin']))

/**
 * 1. GET /api/admin/overview
 * Protected comprehensive operational dashboard statistics.
 */
adminRouter.get(
  '/overview',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        totalAdmins,
        totalCustomers,
        ordersCount,
        pendingPaymentOrders,
        confirmedOrders,
        preparingOrders,
        readyOrders,
        dispatchedOrders,
        deliveredOrders,
        pendingPaymentsCount,
        verifiedPaymentsCount,
        rejectedPaymentsCount,
        totalProducts,
        availableProducts,
        totalCategories,
        pendingFeedbackCount,
        totalFeedbackCount,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ role: 'customer' }),
        Order.countDocuments(),
        Order.countDocuments({ status: 'PENDING_PAYMENT' }),
        Order.countDocuments({ status: 'CONFIRMED' }),
        Order.countDocuments({ status: 'PREPARING' }),
        Order.countDocuments({ status: 'READY' }),
        Order.countDocuments({ status: 'DISPATCHED' }),
        Order.countDocuments({ status: 'DELIVERED' }),
        Payment.countDocuments({ status: 'PENDING' }),
        Payment.countDocuments({ status: 'VERIFIED' }),
        Payment.countDocuments({ status: 'REJECTED' }),
        Product.countDocuments(),
        Product.countDocuments({ isAvailable: true }),
        Category.countDocuments(),
        Feedback.countDocuments({ status: 'PENDING' }),
        Feedback.countDocuments(),
      ])

      // Verified revenue: strictly from orders with paymentStatus === 'VERIFIED'
      const revenueAgg = await Order.aggregate([
        { $match: { paymentStatus: 'VERIFIED' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ])
      const verifiedRevenue = revenueAgg[0]?.total ? Number(revenueAgg[0].total.toFixed(2)) : 0

      // Pending payments amount (in verification queue)
      const pendingRevenueAgg = await Order.aggregate([
        { $match: { paymentStatus: 'PENDING' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ])
      const pendingRevenue = pendingRevenueAgg[0]?.total
        ? Number(pendingRevenueAgg[0].total.toFixed(2))
        : 0

      // Active orders in kitchen and delivery
      const activeOrdersCount =
        confirmedOrders + preparingOrders + readyOrders + dispatchedOrders

      // Current restaurant settings
      const settings = await RestaurantSettings.findOne()

      // Recent 5 orders
      const recentOrders = await Order.find()
        .select('orderNumber customerName customerPhone totalAmount status paymentStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(5)

      // Recent 5 payments
      const recentPayments = await Payment.find()
        .select('paymentNumber orderNumber customerName amount status submittedAt createdAt')
        .sort({ createdAt: -1 })
        .limit(5)

      // Recent 3 feedback inquiries
      const recentFeedback = await Feedback.find()
        .select('name subject status createdAt')
        .sort({ createdAt: -1 })
        .limit(3)

      res.json({
        success: true,
        message: 'Admin access verified by server',
        adminUser: {
          clerkId: req.user!.clerkId,
          email: req.user!.email,
          role: req.user!.role,
        },
        stats: {
          totalUsers,
          totalAdmins,
          totalCustomers,
          restaurantStatus: settings?.restaurantStatus || 'OPEN',
          paymentVerificationQueue: pendingPaymentsCount,
          activeOrdersCount,
          orders: {
            total: ordersCount,
            pendingPayment: pendingPaymentOrders,
            confirmed: confirmedOrders,
            preparing: preparingOrders,
            ready: readyOrders,
            dispatched: dispatchedOrders,
            delivered: deliveredOrders,
            active: activeOrdersCount,
          },
          payments: {
            pending: pendingPaymentsCount,
            verified: verifiedPaymentsCount,
            rejected: rejectedPaymentsCount,
          },
          financial: {
            verifiedRevenue,
            pendingRevenue,
            currency: 'USD',
          },
          catalog: {
            totalProducts,
            availableProducts,
            totalCategories,
          },
          feedback: {
            pending: pendingFeedbackCount,
            total: totalFeedbackCount,
          },
        },
        recentOrders,
        recentPayments,
        recentFeedback,
      })
    } catch (error) {
      console.error('[admin/overview] Error:', error)
      res.status(500).json({ error: 'Failed to fetch admin overview' })
    }
  }
)

/**
 * 2. GET /api/admin/customers
 * Returns customer directory with accurate order statistics and spend.
 */
adminRouter.get(
  '/customers',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const search = (req.query.search as string)?.trim().toLowerCase()

      // Find registered users with role 'customer'
      const customerUsers = await User.find({ role: 'customer' })
        .select('clerkId email name createdAt')
        .sort({ createdAt: -1 })

      // Aggregate order metrics per customer
      const orderMetrics = await Order.aggregate([
        {
          $group: {
            _id: '$clerkId',
            totalOrders: { $sum: 1 },
            verifiedSpent: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'VERIFIED'] }, '$totalAmount', 0],
              },
            },
            latestOrderDate: { $max: '$createdAt' },
            latestOrderNumber: { $last: '$orderNumber' },
            customerName: { $last: '$customerName' },
            customerEmail: { $last: '$customerEmail' },
            customerPhone: { $last: '$customerPhone' },
            deliveryAddress: { $last: '$deliveryAddress' },
            deliveryArea: { $last: '$deliveryArea' },
          },
        },
      ])

      const metricsMap = new Map<string, any>()
      orderMetrics.forEach((m) => {
        if (m._id) metricsMap.set(m._id, m)
      })

      // Combine users with their order metrics
      const combinedCustomers: any[] = []
      const processedClerkIds = new Set<string>()

      for (const u of customerUsers) {
        processedClerkIds.add(u.clerkId)
        const metrics = metricsMap.get(u.clerkId)
        combinedCustomers.push({
          id: u.clerkId,
          clerkId: u.clerkId,
          name: u.name || metrics?.customerName || 'Anonymous Customer',
          email: u.email || metrics?.customerEmail || '—',
          phone: metrics?.customerPhone || '—',
          deliveryAddress: metrics?.deliveryAddress || '—',
          deliveryArea: metrics?.deliveryArea || '—',
          totalOrders: metrics?.totalOrders || 0,
          verifiedSpent: Number((metrics?.verifiedSpent || 0).toFixed(2)),
          lastOrderDate: metrics?.latestOrderDate || null,
          latestOrderNumber: metrics?.latestOrderNumber || null,
          createdAt: u.createdAt,
        })
      }

      // Add customers who placed orders but might not have a separate User doc (guest/direct clerkId)
      for (const m of orderMetrics) {
        if (m._id && !processedClerkIds.has(m._id)) {
          processedClerkIds.add(m._id)
          combinedCustomers.push({
            id: m._id,
            clerkId: m._id,
            name: m.customerName || 'Customer',
            email: m.customerEmail || '—',
            phone: m.customerPhone || '—',
            deliveryAddress: m.deliveryAddress || '—',
            deliveryArea: m.deliveryArea || '—',
            totalOrders: m.totalOrders || 0,
            verifiedSpent: Number((m.verifiedSpent || 0).toFixed(2)),
            lastOrderDate: m.latestOrderDate || null,
            latestOrderNumber: m.latestOrderNumber || null,
            createdAt: m.latestOrderDate,
          })
        }
      }

      // Filter by search if provided
      let result = combinedCustomers
      if (search) {
        result = result.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search) ||
            c.phone.toLowerCase().includes(search) ||
            c.deliveryArea.toLowerCase().includes(search)
        )
      }

      // Sort by totalOrders descending, then verifiedSpent descending
      result.sort((a, b) => b.totalOrders - a.totalOrders || b.verifiedSpent - a.verifiedSpent)

      res.json({
        success: true,
        customers: result,
        totalCount: result.length,
      })
    } catch (error) {
      console.error('[admin/customers] Error:', error)
      res.status(500).json({ error: 'Failed to fetch customers' })
    }
  }
)

/**
 * 3. GET /api/admin/customers/:id
 * Returns customer detail with their full order history.
 */
adminRouter.get(
  '/customers/:id',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const user = await User.findOne({ clerkId: id })
      const orders = await Order.find({ clerkId: id })
        .populate('paymentId', 'paymentNumber status amount submittedAt verifiedAt')
        .sort({ createdAt: -1 })

      const verifiedSpent = orders
        .filter((o) => o.paymentStatus === 'VERIFIED')
        .reduce((sum, o) => sum + o.totalAmount, 0)

      res.json({
        success: true,
        customer: {
          clerkId: id,
          name: user?.name || orders[0]?.customerName || 'Customer',
          email: user?.email || orders[0]?.customerEmail || '—',
          phone: orders[0]?.customerPhone || '—',
          deliveryAddress: orders[0]?.deliveryAddress || '—',
          deliveryArea: orders[0]?.deliveryArea || '—',
          createdAt: user?.createdAt || orders[orders.length - 1]?.createdAt || new Date(),
          totalOrders: orders.length,
          verifiedSpent: Number(verifiedSpent.toFixed(2)),
          orders,
        },
      })
    } catch (error) {
      console.error('[admin/customers/:id] Error:', error)
      res.status(500).json({ error: 'Failed to fetch customer details' })
    }
  }
)

/**
 * 4a. GET /api/admin/reports/products
 * Detailed product catalog report for inventory/status audits and exports (CSV/PDF).
 */
adminRouter.get(
  '/reports/products',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { category, availability, search } = req.query as {
        category?: string
        availability?: string
        search?: string
      }

      const filter: any = {}
      if (category && category !== 'ALL') {
        filter.category = category
      }
      if (availability === 'AVAILABLE') {
        filter.isAvailable = true
      } else if (availability === 'UNAVAILABLE') {
        filter.isAvailable = false
      }
      if (search && search.trim()) {
        filter.name = { $regex: search.trim(), $options: 'i' }
      }

      const products = await Product.find(filter)
        .populate('category', 'name')
        .sort({ name: 1 })

      // Calculate historical sales metrics for each product from VERIFIED orders
      const salesAgg = await Order.aggregate([
        { $match: { paymentStatus: 'VERIFIED' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
      ])

      const salesMap = new Map<string, { unitsSold: number; revenue: number }>()
      salesAgg.forEach((s) => {
        salesMap.set(s._id, {
          unitsSold: s.unitsSold,
          revenue: Number(s.revenue.toFixed(2)),
        })
      })

      const reportItems = products.map((prod) => {
        const catName =
          prod.category && typeof prod.category === 'object' && 'name' in prod.category
            ? (prod.category as any).name
            : 'Uncategorized'
        const sales = salesMap.get(prod.name) || { unitsSold: 0, revenue: 0 }

        return {
          _id: prod._id.toString(),
          name: prod.name,
          price: Number(prod.price.toFixed(2)),
          // BiteFlow items are prepared to order in the kitchen rather than stocked in a warehouse.
          quantity: 'N/A (Made to order)',
          category: catName,
          status: prod.isAvailable ? 'Available' : 'Unavailable',
          isAvailable: prod.isAvailable,
          unitsSold: sales.unitsSold,
          revenueGenerated: sales.revenue,
        }
      })

      const totalCount = reportItems.length
      const availableCount = reportItems.filter((p) => p.isAvailable).length
      const unavailableCount = totalCount - availableCount

      res.json({
        success: true,
        products: reportItems,
        totalCount,
        availableCount,
        unavailableCount,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[admin/reports/products] Error:', error)
      res.status(500).json({ error: 'Failed to generate product report' })
    }
  }
)

/**
 * 4b. GET /api/admin/reports/selling
 * Historical sales performance report for a selected date range.
 * Financial invariant: Includes ONLY orders with paymentStatus === 'VERIFIED'.
 * Uses historical order item snapshots (unitPrice, quantity, subtotal).
 */
adminRouter.get(
  '/reports/selling',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, search } = req.query as {
        startDate?: string
        endDate?: string
        search?: string
      }
      const { dateFilter, error } = parseDateFilter(startDate, endDate)

      if (error) {
        res.status(400).json({ error })
        return
      }

      const matchQuery: any = {
        paymentStatus: 'VERIFIED',
      }
      if (dateFilter) {
        matchQuery.createdAt = dateFilter
      }

      // 1. Overall verified orders and revenue summary
      const summaryAgg = await Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalVerifiedOrders: { $sum: 1 },
            totalVerifiedRevenue: { $sum: '$totalAmount' },
          },
        },
      ])

      const totalVerifiedOrders = summaryAgg[0]?.totalVerifiedOrders || 0
      const totalVerifiedRevenue = Number((summaryAgg[0]?.totalVerifiedRevenue || 0).toFixed(2))

      // 2. Product-level breakdown from historical item snapshots
      const itemsAgg = await Order.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            productId: { $first: '$items.productId' },
            productName: { $first: '$items.name' },
            quantitySold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
            sampleUnitPrice: { $first: '$items.unitPrice' },
          },
        },
        { $sort: { quantitySold: -1, revenue: -1, productName: 1 } },
      ])

      let totalItemCount = 0
      const products = itemsAgg.map((item) => {
        totalItemCount += item.quantitySold
        return {
          productId: item.productId?.toString() || '',
          productName: item.productName,
          quantitySold: item.quantitySold,
          historicalUnitPrice: Number(item.sampleUnitPrice.toFixed(2)),
          revenue: Number(item.revenue.toFixed(2)),
        }
      })

      let filteredProducts = products
      if (search && search.trim()) {
        const query = search.trim().toLowerCase()
        filteredProducts = products.filter((p) => p.productName.toLowerCase().includes(query))
      }

      res.json({
        success: true,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        summary: {
          totalVerifiedRevenue,
          totalItemCount,
          totalVerifiedOrders,
          productsSoldCount: filteredProducts.length,
          currency: 'USD',
        },
        products: filteredProducts,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[admin/reports/selling] Error:', error)
      res.status(500).json({ error: 'Failed to generate selling report' })
    }
  }
)

/**
 * 4c. GET /api/admin/reports/orders
 * Comprehensive orders report with date range filtering and derived delivery status.
 */
adminRouter.get(
  '/reports/orders',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, status, paymentStatus, search } = req.query as {
        startDate?: string
        endDate?: string
        status?: string
        paymentStatus?: string
        search?: string
      }

      const { dateFilter, error } = parseDateFilter(startDate, endDate)
      if (error) {
        res.status(400).json({ error })
        return
      }

      const matchQuery: any = {}
      if (dateFilter) {
        matchQuery.createdAt = dateFilter
      }
      if (status && status !== 'ALL') {
        matchQuery.status = status
      }
      if (paymentStatus && paymentStatus !== 'ALL') {
        matchQuery.paymentStatus = paymentStatus
      }
      if (search && search.trim()) {
        const s = search.trim()
        matchQuery.$or = [
          { orderNumber: { $regex: s, $options: 'i' } },
          { customerName: { $regex: s, $options: 'i' } },
          { customerPhone: { $regex: s, $options: 'i' } },
          { customerEmail: { $regex: s, $options: 'i' } },
          { deliveryAddress: { $regex: s, $options: 'i' } },
        ]
      }

      const orders = await Order.find(matchQuery)
        .sort({ createdAt: -1, orderNumber: -1 })
        .lean()

      const statusLabels: Record<OrderStatus, string> = {
        PENDING_PAYMENT: 'Awaiting Payment',
        CONFIRMED: 'Confirmed',
        PREPARING: 'Kitchen Preparing',
        READY: 'Ready for Delivery',
        DISPATCHED: 'Out for Delivery',
        DELIVERED: 'Delivered',
      }

      const deliveryStatusMap: Record<OrderStatus, string> = {
        DELIVERED: 'Delivered',
        DISPATCHED: 'Out for Delivery',
        READY: 'Ready for Dispatch',
        PREPARING: 'In Kitchen Prep',
        CONFIRMED: 'Pending Kitchen',
        PENDING_PAYMENT: 'Awaiting Verification',
      }

      let totalAmount = 0
      const statusCounts: Record<string, number> = {}
      const paymentCounts: Record<string, number> = {}

      const reportOrders = orders.map((ord: any) => {
        totalAmount += ord.totalAmount
        statusCounts[ord.status] = (statusCounts[ord.status] || 0) + 1
        paymentCounts[ord.paymentStatus] = (paymentCounts[ord.paymentStatus] || 0) + 1

        const itemCount = ord.items.reduce((acc: number, item: any) => acc + item.quantity, 0)

        return {
          _id: String(ord._id),
          orderNumber: ord.orderNumber,
          createdAt: ord.createdAt instanceof Date ? ord.createdAt.toISOString() : new Date(ord.createdAt).toISOString(),
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          deliveryAddress: ord.deliveryAddress,
          deliveryArea: ord.deliveryArea,
          status: ord.status,
          statusLabel: statusLabels[ord.status as OrderStatus] || ord.status,
          paymentStatus: ord.paymentStatus,
          paymentStatusLabel:
            ord.paymentStatus === 'VERIFIED'
              ? 'Verified'
              : ord.paymentStatus === 'PENDING'
                ? 'Pending'
                : 'Rejected',
          deliveryStatus: deliveryStatusMap[ord.status as OrderStatus] || 'Pending',
          itemCount,
          totalAmount: Number(ord.totalAmount.toFixed(2)),
        }
      })

      res.json({
        success: true,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        summary: {
          totalOrders: reportOrders.length,
          totalAmount: Number(totalAmount.toFixed(2)),
          statusCounts,
          paymentCounts,
          currency: 'USD',
        },
        orders: reportOrders,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[admin/reports/orders] Error:', error)
      res.status(500).json({ error: 'Failed to generate order report' })
    }
  }
)

/**
 * 4d. GET /api/admin/reports/feedback
 * Contact and feedback inquiries report with date and status filtering.
 */
adminRouter.get(
  '/reports/feedback',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, status } = req.query as {
        startDate?: string
        endDate?: string
        status?: string
      }

      const { dateFilter, error } = parseDateFilter(startDate, endDate)
      if (error) {
        res.status(400).json({ error })
        return
      }

      const matchQuery: any = {}
      if (dateFilter) {
        matchQuery.createdAt = dateFilter
      }
      if (status && status !== 'ALL' && ['PENDING', 'REVIEWED', 'ARCHIVED'].includes(status)) {
        matchQuery.status = status
      }

      const feedbackRecords = await Feedback.find(matchQuery)
        .sort({ createdAt: -1 })
        .lean()

      const summary = {
        totalCount: feedbackRecords.length,
        pendingCount: feedbackRecords.filter((f) => f.status === 'PENDING').length,
        reviewedCount: feedbackRecords.filter((f) => f.status === 'REVIEWED').length,
        archivedCount: feedbackRecords.filter((f) => f.status === 'ARCHIVED').length,
      }

      const reportItems = feedbackRecords.map((f: any) => ({
        _id: String(f._id),
        customer: f.name,
        email: f.email,
        phone: f.phone || '—',
        subject: f.subject,
        message: f.message,
        status: f.status,
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : new Date(f.createdAt).toISOString(),
        reviewedBy: f.reviewedBy || null,
        reviewedAt: f.reviewedAt ? (f.reviewedAt instanceof Date ? f.reviewedAt.toISOString() : new Date(f.reviewedAt).toISOString()) : null,
      }))

      res.json({
        success: true,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        summary,
        feedback: reportItems,
        generatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[admin/reports/feedback] Error:', error)
      res.status(500).json({ error: 'Failed to generate feedback report' })
    }
  }
)

/**
 * 4. GET /api/admin/reports
 * Operational and sales reports with server-side aggregation and date filtering.
 */
adminRouter.get(
  '/reports',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
      const { dateFilter, error } = parseDateFilter(startDate, endDate)

      if (error) {
        res.status(400).json({ error })
        return
      }

      const matchQuery: any = {}
      if (dateFilter) {
        matchQuery.createdAt = dateFilter
      }

      // 1. Revenue & Financial Summary
      const revenueAgg = await Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            verifiedRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'VERIFIED'] }, '$totalAmount', 0] },
            },
            verifiedOrdersCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'VERIFIED'] }, 1, 0] },
            },
            pendingPaymentsAmount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'PENDING'] }, '$totalAmount', 0] },
            },
            pendingPaymentsCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'PENDING'] }, 1, 0] },
            },
            rejectedPaymentsCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'REJECTED'] }, 1, 0] },
            },
          },
        },
      ])

      const summary = revenueAgg[0] || {
        totalOrders: 0,
        verifiedRevenue: 0,
        verifiedOrdersCount: 0,
        pendingPaymentsAmount: 0,
        pendingPaymentsCount: 0,
        rejectedPaymentsCount: 0,
      }

      const verifiedRevenue = Number((summary.verifiedRevenue || 0).toFixed(2))
      const pendingPaymentsAmount = Number((summary.pendingPaymentsAmount || 0).toFixed(2))
      const averageOrderValue =
        summary.verifiedOrdersCount > 0
          ? Number((verifiedRevenue / summary.verifiedOrdersCount).toFixed(2))
          : 0

      // 2. Orders Grouped by Status
      const statusAgg = await Order.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])

      const statusMap = new Map<string, number>()
      statusAgg.forEach((s) => statusMap.set(s._id, s.count))

      const statusLabels: Record<OrderStatus, string> = {
        PENDING_PAYMENT: 'Awaiting Payment',
        CONFIRMED: 'Confirmed',
        PREPARING: 'Kitchen Preparing',
        READY: 'Ready for Delivery',
        DISPATCHED: 'Out for Delivery',
        DELIVERED: 'Delivered',
      }

      const statusBreakdown = (
        Object.keys(statusLabels) as OrderStatus[]
      ).map((st) => {
        const count = statusMap.get(st) || 0
        const percentage =
          summary.totalOrders > 0 ? Number(((count / summary.totalOrders) * 100).toFixed(1)) : 0
        return {
          status: st,
          label: statusLabels[st],
          count,
          percentage,
        }
      })

      // 3. Payment Status Breakdown
      const paymentBreakdown = [
        {
          paymentStatus: 'VERIFIED',
          label: 'Verified Payments',
          count: summary.verifiedOrdersCount,
          amount: verifiedRevenue,
        },
        {
          paymentStatus: 'PENDING',
          label: 'Pending Verification',
          count: summary.pendingPaymentsCount,
          amount: pendingPaymentsAmount,
        },
        {
          paymentStatus: 'REJECTED',
          label: 'Rejected Payments',
          count: summary.rejectedPaymentsCount,
          amount: 0,
        },
      ]

      // 4. Top Selling Products (From verified orders only)
      const topProductsAgg = await Order.aggregate([
        { $match: { ...matchQuery, paymentStatus: 'VERIFIED' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            productId: { $first: '$items.productId' },
            productName: { $first: '$items.name' },
            unitsSold: { $sum: '$items.quantity' },
            revenueGenerated: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 8 },
      ])

      const topProducts = topProductsAgg.map((p) => ({
        productId: p.productId,
        name: p.productName,
        unitsSold: p.unitsSold,
        revenueGenerated: Number(p.revenueGenerated.toFixed(2)),
      }))

      // 5. Delivery Performance Summary
      const readyCount = statusMap.get('READY') || 0
      const dispatchedCount = statusMap.get('DISPATCHED') || 0
      const deliveredCount = statusMap.get('DELIVERED') || 0

      res.json({
        success: true,
        report: {
          period: {
            startDate: startDate || null,
            endDate: endDate || null,
          },
          summary: {
            totalOrders: summary.totalOrders,
            verifiedOrdersCount: summary.verifiedOrdersCount,
            verifiedRevenue,
            pendingPaymentsAmount,
            averageOrderValue,
            currency: 'USD',
          },
          statusBreakdown,
          paymentBreakdown,
          topProducts,
          deliverySummary: {
            readyCount,
            dispatchedCount,
            deliveredCount,
          },
          generatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('[admin/reports] Error:', error)
      res.status(500).json({ error: 'Failed to generate operational reports' })
    }
  }
)

/**
 * 5. GET /api/admin/feedback
 * Returns customer feedback and contact inquiries with status and text search filtering.
 */
adminRouter.get(
  '/feedback',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { status, search } = req.query as { status?: string; search?: string }
      const filter: any = {}
      if (status && status !== 'ALL' && ['PENDING', 'REVIEWED', 'ARCHIVED'].includes(status)) {
        filter.status = status
      }
      if (search && search.trim()) {
        const term = search.trim()
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escaped, 'i')
        filter.$or = [
          { name: regex },
          { email: regex },
          { subject: regex },
          { message: regex },
        ]
      }

      const feedback = await Feedback.find(filter).sort({ createdAt: -1 })
      const pendingCount = await Feedback.countDocuments({ status: 'PENDING' })

      res.json({
        success: true,
        feedback,
        pendingCount,
        totalCount: feedback.length,
      })
    } catch (error) {
      console.error('[admin/feedback] Error:', error)
      res.status(500).json({ error: 'Failed to fetch feedback' })
    }
  }
)

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'ARCHIVED']),
})

/**
 * 6. PATCH /api/admin/feedback/:id/status
 * Mark customer feedback reviewed or archived.
 */
adminRouter.patch(
  '/feedback/:id/status',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = String(req.params.id)
      const parseResult = updateFeedbackStatusSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid feedback status' })
        return
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ error: 'Feedback record not found' })
        return
      }

      const targetFeedback = await Feedback.findById(id)
      if (!targetFeedback) {
        res.status(404).json({ error: 'Feedback record not found' })
        return
      }

      targetFeedback.status = parseResult.data.status as FeedbackStatus
      targetFeedback.reviewedBy = req.user!.email || req.user!.clerkId
      targetFeedback.reviewedAt = new Date()
      await targetFeedback.save()

      res.json({
        success: true,
        message: `Feedback updated to ${targetFeedback.status}`,
        feedback: targetFeedback,
      })
    } catch (error) {
      console.error('[admin/feedback/:id/status] Error:', error)
      res.status(500).json({ error: 'Failed to update feedback status' })
    }
  }
)

/**
 * 7. GET /api/admin/settings
 * Returns current restaurant operational settings.
 */
adminRouter.get(
  '/settings',
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      let settings = await RestaurantSettings.findOne()
      if (!settings) {
        settings = await RestaurantSettings.create({
          restaurantName: 'BiteFlow',
          contactPhone: '+252-61xxxxxxx',
          contactEmail: 'kitchen@biteflow.com',
          operatingHours: '6:00 AM – 11:30 PM',
          restaurantStatus: 'OPEN',
          deliveryNotice: 'Free delivery on all orders within local delivery zones.',
          isDeliveryActive: true,
          currency: 'USD',
          updatedBy: 'system',
        })
      }

      res.json({
        success: true,
        settings,
      })
    } catch (error) {
      console.error('[admin/settings] Error:', error)
      res.status(500).json({ error: 'Failed to fetch settings' })
    }
  }
)

export const updateSettingsSchema = z
  .object({
    restaurantName: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').optional(),
    contactPhone: z.string().trim().min(5, 'Phone must be at least 5 characters').optional(),
    contactEmail: z.string().trim().email('Valid email is required').optional(),
    operatingHours: z.string().trim().min(2, 'Operating hours are required').optional(),
    restaurantStatus: z.enum(['OPEN', 'CLOSED', 'BUSY']).optional(),
    deliveryNotice: z.string().trim().max(300).optional(),
    isDeliveryActive: z.boolean().optional(),
    currency: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one setting field must be provided to update',
  })

/**
 * 8. PATCH /api/admin/settings
 * Updates restaurant operational settings.
 */
adminRouter.patch(
  '/settings',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parseResult = updateSettingsSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || 'Invalid settings payload',
        })
        return
      }

      let settings = await RestaurantSettings.findOne()
      if (!settings) {
        settings = new RestaurantSettings()
      }

      const {
        restaurantName,
        contactPhone,
        contactEmail,
        operatingHours,
        restaurantStatus,
        deliveryNotice,
        isDeliveryActive,
        currency,
      } = parseResult.data

      if (restaurantName !== undefined) settings.restaurantName = restaurantName
      if (contactPhone !== undefined) settings.contactPhone = contactPhone
      if (contactEmail !== undefined) settings.contactEmail = contactEmail
      if (operatingHours !== undefined) settings.operatingHours = operatingHours
      if (restaurantStatus !== undefined) settings.restaurantStatus = restaurantStatus as RestaurantOperationalStatus
      if (deliveryNotice !== undefined) settings.deliveryNotice = deliveryNotice
      if (isDeliveryActive !== undefined) settings.isDeliveryActive = isDeliveryActive
      if (currency !== undefined) settings.currency = currency
      settings.updatedBy = req.user!.email || req.user!.clerkId

      await settings.save()

      res.json({
        success: true,
        message: 'Restaurant settings updated successfully',
        settings,
      })
    } catch (error) {
      console.error('[admin/settings] Error:', error)
      res.status(500).json({ error: 'Failed to update restaurant settings' })
    }
  }
)

/**
 * 9. GET /api/admin/users
 * Returns list of registered users and their roles.
 */
adminRouter.get(
  '/users',
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const users = await User.find()
        .select('clerkId email name role createdAt updatedAt')
        .sort({ createdAt: -1 })
      res.json({ users })
    } catch (error) {
      console.error('[admin/users] Error:', error)
      res.status(500).json({ error: 'Failed to fetch users' })
    }
  }
)

export const updateRoleSchema = z.object({
  role: z.enum(['customer', 'admin']),
})

/**
 * 10. PATCH /api/admin/users/:clerkId/role
 * Admin endpoint to update another user's role.
 */
adminRouter.patch(
  '/users/:clerkId/role',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { clerkId } = req.params
      const parseResult = updateRoleSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid role. Must be "customer" or "admin"' })
        return
      }

      const targetUser = await User.findOne({ clerkId })
      if (!targetUser) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      targetUser.role = parseResult.data.role as UserRole
      await targetUser.save()

      res.json({
        success: true,
        message: `Updated role for user ${targetUser.email} to ${targetUser.role}`,
        user: {
          clerkId: targetUser.clerkId,
          email: targetUser.email,
          role: targetUser.role,
        },
      })
    } catch (error) {
      console.error('[admin/update-role] Error:', error)
      res.status(500).json({ error: 'Failed to update user role' })
    }
  }
)
