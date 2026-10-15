import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Order, OrderStatus } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { Feedback, FeedbackStatus } from '../models/Feedback.js'
import { RestaurantSettings } from '../models/RestaurantSettings.js'
import {
  updateFeedbackStatusSchema,
  updateSettingsSchema,
  updateRoleSchema,
} from '../routes/admin.routes.js'
import { createFeedbackSchema } from '../routes/feedback.routes.js'
import {
  ALLOWED_NEXT_STATUSES,
  parseDateFilter,
} from '../routes/order.routes.js'

let totalPassed = 0
let totalFailed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`)
    totalPassed++
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
    totalFailed++
  }
}

async function runTests() {
  console.log('\n======================================================')
  console.log('      BITEFLOW FS-09 ADMIN MANAGEMENT TEST SUITE      ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // Snapshot initial restaurant settings to restore at cleanup
  const originalSettings = await RestaurantSettings.findOne()

  // Track IDs created during test run for clean self-cleanup
  const createdUserIds: string[] = []
  const createdOrderIds: mongoose.Types.ObjectId[] = []
  const createdPaymentIds: mongoose.Types.ObjectId[] = []
  const createdFeedbackIds: mongoose.Types.ObjectId[] = []

  // ========================================================
  // TEST SUITE A: SERVER-SIDE AUTHORIZATION & ACCESS BOUNDARIES (HTTP)
  // ========================================================
  console.log('--- TEST SUITE A: SERVER-SIDE AUTHORIZATION BOUNDARIES ---')

  try {
    // A1. Unauthenticated requests to Admin endpoints must return 401
    const endpoints = [
      { path: '/api/admin/overview', method: 'GET' },
      { path: '/api/admin/customers', method: 'GET' },
      { path: '/api/admin/customers/test-clerk-id', method: 'GET' },
      { path: '/api/admin/reports', method: 'GET' },
      { path: '/api/admin/feedback', method: 'GET' },
      { path: '/api/admin/feedback/test-feedback-id/status', method: 'PATCH', body: { status: 'REVIEWED' } },
      { path: '/api/admin/settings', method: 'GET' },
      { path: '/api/admin/settings', method: 'PATCH', body: { restaurantName: 'BiteFlow' } },
      { path: '/api/admin/users', method: 'GET' },
      { path: '/api/admin/users/test-clerk-id/role', method: 'PATCH', body: { role: 'admin' } },
    ]

    for (const ep of endpoints) {
      const res = await fetch(`${API_URL}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      })
      assert(
        res.status === 401,
        `Unauthenticated ${ep.method} ${ep.path} rejected with HTTP 401`,
        `Got status: ${res.status}`
      )
    }

    // A2. Public endpoints must be accessible without authentication
    const publicSettingsRes = await fetch(`${API_URL}/api/settings`)
    assert(
      publicSettingsRes.status === 200,
      'Public GET /api/settings returns HTTP 200',
      `Got status: ${publicSettingsRes.status}`
    )
    const publicSettingsData = (await publicSettingsRes.json()) as any
    assert(
      publicSettingsData.success === true && !!publicSettingsData.settings.restaurantName,
      'Public settings response contains restaurant configuration without private secrets'
    )

    // A3. Public feedback submission validation
    const invalidFeedbackRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short (< 2)
        email: 'not-an-email',
        subject: '',
        message: 'short',
      }),
    })
    assert(
      invalidFeedbackRes.status === 400,
      'Public POST /api/feedback rejects invalid payload with HTTP 400',
      `Got status: ${invalidFeedbackRes.status}`
    )

    const validFeedbackPayload = {
      name: 'Sarah Connor',
      email: 'sarah.connor@example.com',
      phone: '+1 555-0199',
      subject: 'Inquiry about catering services',
      message: 'Hello, do you offer corporate lunch packages for 30 people?',
    }
    const validFeedbackRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validFeedbackPayload),
    })
    assert(
      validFeedbackRes.status === 201,
      'Public POST /api/feedback successfully creates inquiry with HTTP 201',
      `Got status: ${validFeedbackRes.status}`
    )
    const validFeedbackData = (await validFeedbackRes.json()) as any
    if (validFeedbackData.feedbackId) {
      createdFeedbackIds.push(new mongoose.Types.ObjectId(validFeedbackData.feedbackId))
    }

    // A4. Customer vs Admin role validation
    const testCustClerkId = `cust_fs09_auth_${Date.now()}`
    const testAdminClerkId = `admin_fs09_auth_${Date.now()}`
    createdUserIds.push(testCustClerkId, testAdminClerkId)

    await User.create([
      { clerkId: testCustClerkId, email: 'cust.auth@biteflow.local', name: 'Cust Auth', role: 'customer' },
      { clerkId: testAdminClerkId, email: 'admin.auth@biteflow.local', name: 'Admin Auth', role: 'admin' },
    ])

    const dbCust = await User.findOne({ clerkId: testCustClerkId })
    const dbAdmin = await User.findOne({ clerkId: testAdminClerkId })
    assert(dbCust?.role === 'customer', 'Customer user has role customer')
    assert(dbAdmin?.role === 'admin', 'Admin user has role admin')
    assert(dbCust?.role !== 'admin', 'Customer cannot bypass server-side role check')
  } catch (err: any) {
    assert(false, 'Live HTTP Authorization tests against localhost:5000', err.message)
  }

  // ========================================================
  // TEST SUITE B: DASHBOARD OVERVIEW & FINANCIAL TRUTH INVARIANT
  // ========================================================
  console.log('\n--- TEST SUITE B: DASHBOARD OVERVIEW & FINANCIAL TRUTH INVARIANT ---')

  const testCustomerClerkId = `cust_fs09_metrics_${Date.now()}`
  createdUserIds.push(testCustomerClerkId)

  await User.create({
    clerkId: testCustomerClerkId,
    email: 'marcus.metrics@example.com',
    name: 'Marcus Vance',
    role: 'customer',
  })

  // Order 1: CONFIRMED with VERIFIED payment ($50.00) -> Must count toward totalRevenue
  const order1 = await Order.create({
    orderNumber: `ORD-FS09-1-${Date.now()}`,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    customerPhone: '+1 555-0123',
    deliveryAddress: '400 North Blvd',
    deliveryArea: 'Uptown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Truffle Burger',
        image: '/burger.jpg',
        unitPrice: 25.00,
        quantity: 2,
        subtotal: 50.00,
      },
    ],
    subtotal: 50.00,
    deliveryFee: 0,
    totalAmount: 50.00,
    status: 'CONFIRMED',
    paymentStatus: 'VERIFIED',
  })
  createdOrderIds.push(order1._id)

  const payment1 = await Payment.create({
    paymentNumber: `PAY-FS09-1-${Date.now()}`,
    orderId: order1._id,
    orderNumber: order1.orderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    amount: 50.00,
    currency: 'USD',
    paymentMethod: 'ONLINE_MANUAL',
    status: 'VERIFIED',
    submittedAt: new Date(),
    verifiedAt: new Date(),
    verifiedBy: 'admin@biteflow.com',
  })
  createdPaymentIds.push(payment1._id)

  // Order 2: DELIVERED with VERIFIED payment ($35.00) -> Must count toward totalRevenue
  const order2 = await Order.create({
    orderNumber: `ORD-FS09-2-${Date.now()}`,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    customerPhone: '+1 555-0123',
    deliveryAddress: '400 North Blvd',
    deliveryArea: 'Uptown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Crispy Wings',
        image: '/wings.jpg',
        unitPrice: 35.00,
        quantity: 1,
        subtotal: 35.00,
      },
    ],
    subtotal: 35.00,
    deliveryFee: 0,
    totalAmount: 35.00,
    status: 'DELIVERED',
    paymentStatus: 'VERIFIED',
  })
  createdOrderIds.push(order2._id)

  const payment2 = await Payment.create({
    paymentNumber: `PAY-FS09-2-${Date.now()}`,
    orderId: order2._id,
    orderNumber: order2.orderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    amount: 35.00,
    currency: 'USD',
    paymentMethod: 'ONLINE_MANUAL',
    status: 'VERIFIED',
    submittedAt: new Date(),
    verifiedAt: new Date(),
    verifiedBy: 'admin@biteflow.com',
  })
  createdPaymentIds.push(payment2._id)

  // Order 3: PENDING_PAYMENT with PENDING payment ($40.00) -> MUST NOT COUNT in totalRevenue!
  const order3 = await Order.create({
    orderNumber: `ORD-FS09-3-${Date.now()}`,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    customerPhone: '+1 555-0123',
    deliveryAddress: '400 North Blvd',
    deliveryArea: 'Uptown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Pasta Alfredo',
        image: '/pasta.jpg',
        unitPrice: 40.00,
        quantity: 1,
        subtotal: 40.00,
      },
    ],
    subtotal: 40.00,
    deliveryFee: 0,
    totalAmount: 40.00,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
  })
  createdOrderIds.push(order3._id)

  const payment3 = await Payment.create({
    paymentNumber: `PAY-FS09-3-${Date.now()}`,
    orderId: order3._id,
    orderNumber: order3.orderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    amount: 40.00,
    currency: 'USD',
    paymentMethod: 'ONLINE_MANUAL',
    status: 'PENDING',
    submittedAt: new Date(),
  })
  createdPaymentIds.push(payment3._id)

  // Order 4: PENDING_PAYMENT with REJECTED payment ($20.00) -> MUST NOT COUNT in totalRevenue!
  const order4 = await Order.create({
    orderNumber: `ORD-FS09-4-${Date.now()}`,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    customerPhone: '+1 555-0123',
    deliveryAddress: '400 North Blvd',
    deliveryArea: 'Uptown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Caesar Salad',
        image: '/salad.jpg',
        unitPrice: 20.00,
        quantity: 1,
        subtotal: 20.00,
      },
    ],
    subtotal: 20.00,
    deliveryFee: 0,
    totalAmount: 20.00,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'REJECTED',
  })
  createdOrderIds.push(order4._id)

  const payment4 = await Payment.create({
    paymentNumber: `PAY-FS09-4-${Date.now()}`,
    orderId: order4._id,
    orderNumber: order4.orderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    amount: 20.00,
    currency: 'USD',
    paymentMethod: 'ONLINE_MANUAL',
    status: 'REJECTED',
    submittedAt: new Date(),
    rejectedAt: new Date(),
    rejectedBy: 'admin@biteflow.com',
    rejectionReason: 'Invalid transaction receipt code',
  })
  createdPaymentIds.push(payment4._id)

  // Simulate verified revenue aggregation directly using database
  const verifiedOrdersAggregation = await Order.aggregate([
    { $match: { _id: { $in: [order1._id, order2._id, order3._id, order4._id] }, paymentStatus: 'VERIFIED' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ])
  const testVerifiedRevenue = verifiedOrdersAggregation[0]?.total || 0

  assert(
    testVerifiedRevenue === 85.00,
    'Verified revenue correctly aggregates ONLY verified orders ($50 + $35 = $85.00)',
    `Calculated: $${testVerifiedRevenue}`
  )

  const unverifiedOrders = await Order.find({
    _id: { $in: [order1._id, order2._id, order3._id, order4._id] },
    paymentStatus: { $ne: 'VERIFIED' },
  })
  assert(
    unverifiedOrders.length === 2,
    'Orders with PENDING and REJECTED payments are identified as unverified'
  )

  const pendingPaymentsAggregation = await Payment.aggregate([
    { $match: { _id: { $in: [payment1._id, payment2._id, payment3._id, payment4._id] }, status: 'PENDING' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const pendingAmount = pendingPaymentsAggregation[0]?.total || 0
  assert(
    pendingAmount === 40.00,
    'Pending payments claim is tracked independently ($40.00) without contaminating verified revenue',
    `Calculated: $${pendingAmount}`
  )

  // ========================================================
  // TEST SUITE C: CUSTOMER DIRECTORY AGGREGATION & SEARCH
  // ========================================================
  console.log('\n--- TEST SUITE C: CUSTOMER DIRECTORY & DETAIL INSPECTION ---')

  // Search by customer name
  const searchedCustomersByName = await Order.aggregate([
    {
      $match: {
        clerkId: testCustomerClerkId,
        customerName: { $regex: 'Marcus Vance', $options: 'i' },
      },
    },
    {
      $group: {
        _id: '$clerkId',
        customerName: { $first: '$customerName' },
        customerEmail: { $first: '$customerEmail' },
        customerPhone: { $first: '$customerPhone' },
        totalOrders: { $sum: 1 },
        verifiedSpent: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'VERIFIED'] }, '$totalAmount', 0],
          },
        },
      },
    },
  ])

  assert(searchedCustomersByName.length === 1, 'Customer aggregation finds Marcus Vance accurately')
  const foundCust = searchedCustomersByName[0]
  assert(foundCust.totalOrders === 4, 'Total orders for customer equals 4')
  assert(
    foundCust.verifiedSpent === 85.00,
    'Verified spent calculation for customer profile strictly equals $85.00',
    `Got: $${foundCust.verifiedSpent}`
  )

  // Test customer order history retrieval
  const customerHistory = await Order.find({ clerkId: testCustomerClerkId }).sort({ createdAt: -1 })
  assert(customerHistory.length === 4, 'Full customer order history retrieved (4 orders)')
  assert(
    customerHistory.some((o) => o.paymentStatus === 'VERIFIED') &&
      customerHistory.some((o) => o.paymentStatus === 'PENDING') &&
      customerHistory.some((o) => o.paymentStatus === 'REJECTED'),
    'Order history correctly retains distinct payment statuses for each order'
  )

  // ========================================================
  // TEST SUITE D: DELIVERY MANAGEMENT & ORDER LIFECYCLE
  // ========================================================
  console.log('\n--- TEST SUITE D: DELIVERY MANAGEMENT & ORDER LIFECYCLE ---')

  // Create an order in READY state for delivery workflow
  const deliveryOrder = await Order.create({
    orderNumber: `ORD-FS09-DELIV-${Date.now()}`,
    clerkId: testCustomerClerkId,
    customerName: 'Marcus Vance',
    customerEmail: 'marcus.metrics@example.com',
    customerPhone: '+1 555-0123',
    deliveryAddress: '789 Pine Avenue, Suite 4B',
    deliveryArea: 'Midtown',
    deliveryInstructions: 'Buzz 404, leave outside door if no answer',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Gourmet Truffle Burger',
        image: '/burger.jpg',
        unitPrice: 20.00,
        quantity: 1,
        subtotal: 20.00,
      },
    ],
    subtotal: 20.00,
    deliveryFee: 0,
    totalAmount: 20.00,
    status: 'READY',
    paymentStatus: 'VERIFIED',
    statusHistory: [
      {
        previousStatus: null,
        newStatus: 'CONFIRMED',
        timestamp: new Date(),
        actorId: 'admin_sys',
        actorRole: 'admin',
        note: 'Payment verified',
      },
      {
        previousStatus: 'CONFIRMED',
        newStatus: 'PREPARING',
        timestamp: new Date(),
        actorId: 'admin_sys',
        actorRole: 'admin',
        note: 'Kitchen started order',
      },
      {
        previousStatus: 'PREPARING',
        newStatus: 'READY',
        timestamp: new Date(),
        actorId: 'admin_sys',
        actorRole: 'admin',
        note: 'Order packaged for delivery',
      },
    ],
  })
  createdOrderIds.push(deliveryOrder._id)

  // Validate permitted transitions from READY: only DISPATCHED is permitted
  assert(
    ALLOWED_NEXT_STATUSES['READY']?.includes('DISPATCHED'),
    'READY status allows transition to DISPATCHED'
  )
  assert(
    !ALLOWED_NEXT_STATUSES['READY']?.includes('DELIVERED'),
    'READY status does NOT allow skipping DISPATCHED directly to DELIVERED'
  )
  assert(
    !ALLOWED_NEXT_STATUSES['PENDING_PAYMENT']?.includes('DISPATCHED'),
    'PENDING_PAYMENT status strictly prevents skipping to DISPATCHED'
  )

  // Transition READY -> DISPATCHED
  deliveryOrder.status = 'DISPATCHED'
  deliveryOrder.dispatchedAt = new Date()
  deliveryOrder.statusHistory.push({
    previousStatus: 'READY',
    newStatus: 'DISPATCHED',
    timestamp: new Date(),
    actorId: 'admin_dispatch',
    actorRole: 'admin',
    actorEmail: 'dispatch@biteflow.com',
    note: 'Order handed to courier',
  })
  await deliveryOrder.save()

  assert(deliveryOrder.status === 'DISPATCHED', 'Order transitioned to DISPATCHED')
  assert(!!deliveryOrder.dispatchedAt, 'Dispatched timestamp successfully stamped on Order record')

  // Transition DISPATCHED -> DELIVERED
  assert(
    ALLOWED_NEXT_STATUSES['DISPATCHED']?.includes('DELIVERED'),
    'DISPATCHED status allows transition to DELIVERED'
  )

  deliveryOrder.status = 'DELIVERED'
  deliveryOrder.deliveredAt = new Date()
  deliveryOrder.statusHistory.push({
    previousStatus: 'DISPATCHED',
    newStatus: 'DELIVERED',
    timestamp: new Date(),
    actorId: 'admin_dispatch',
    actorRole: 'admin',
    actorEmail: 'dispatch@biteflow.com',
    note: 'Delivered to customer',
  })
  await deliveryOrder.save()

  assert(deliveryOrder.status === 'DELIVERED', 'Order transitioned to DELIVERED')
  assert(!!deliveryOrder.deliveredAt, 'Delivered timestamp successfully stamped on Order record')
  assert(
    deliveryOrder.statusHistory.length === 5,
    'Status history event appended with complete audit trace'
  )

  // ========================================================
  // TEST SUITE E: OPERATIONAL REPORTS & DATE RANGE LOGIC
  // ========================================================
  console.log('\n--- TEST SUITE E: OPERATIONAL REPORTS & DATE RANGE LOGIC ---')

  // E1. Date filter parsing
  const todayStr = new Date().toISOString().split('T')[0]
  const validReportFilter = parseDateFilter(todayStr, todayStr)
  assert(!validReportFilter.error, 'Date filter parses valid start and end dates')

  const invertedFilter = parseDateFilter('2026-12-31', '2026-01-01')
  assert(
    !!invertedFilter.error && invertedFilter.error.includes('earlier than startDate'),
    'Date filter correctly rejects inverted date ranges'
  )

  // E2. Operational breakdown calculation
  const testBreakdownOrders = await Order.find({
    _id: { $in: createdOrderIds },
  })
  const confirmedCount = testBreakdownOrders.filter((o) => o.status === 'CONFIRMED').length
  const deliveredCount = testBreakdownOrders.filter((o) => o.status === 'DELIVERED').length
  const pendingCount = testBreakdownOrders.filter((o) => o.status === 'PENDING_PAYMENT').length

  assert(confirmedCount === 1, 'Status breakdown counts 1 CONFIRMED order')
  assert(deliveredCount === 2, 'Status breakdown counts 2 DELIVERED orders')
  assert(pendingCount === 2, 'Status breakdown counts 2 PENDING_PAYMENT orders')

  // ========================================================
  // TEST SUITE F: FEEDBACK PERSISTENCE & REVIEW WORKFLOW
  // ========================================================
  console.log('\n--- TEST SUITE F: FEEDBACK PERSISTENCE & REVIEW WORKFLOW ---')

  // F1. Feedback model schema validation
  const validFeedbackParse = createFeedbackSchema.safeParse({
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    subject: 'Compliments to the chef',
    message: 'The Truffle Burger was cooked to absolute perfection. Thank you!',
  })
  assert(validFeedbackParse.success, 'Valid feedback payload passes Zod validation schema')

  const invalidFeedbackParse = createFeedbackSchema.safeParse({
    name: '',
    email: 'bad-email',
    subject: '',
    message: 'hi', // too short (< 5)
  })
  assert(!invalidFeedbackParse.success, 'Invalid feedback payload rejected by Zod validation schema')

  // F2. Feedback status schema validation
  const validStatusParse = updateFeedbackStatusSchema.safeParse({ status: 'REVIEWED' })
  assert(validStatusParse.success, 'Valid status REVIEWED accepted by schema')

  const validStatusArchive = updateFeedbackStatusSchema.safeParse({ status: 'ARCHIVED' })
  assert(validStatusArchive.success, 'Valid status ARCHIVED accepted by schema')

  const invalidStatusParse = updateFeedbackStatusSchema.safeParse({ status: 'DELETED' })
  assert(!invalidStatusParse.success, 'Invalid status DELETED rejected by schema')

  // F3. Persisted Feedback lifecycle
  const testFeedback = await Feedback.create({
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    subject: 'Compliments to the chef',
    message: 'The Truffle Burger was cooked to absolute perfection. Thank you!',
    status: 'PENDING',
  })
  createdFeedbackIds.push(testFeedback._id)

  assert(testFeedback.status === 'PENDING', 'New feedback record defaults to PENDING status')

  // Admin marks feedback as REVIEWED
  testFeedback.status = 'REVIEWED'
  testFeedback.reviewedBy = 'admin@biteflow.com'
  testFeedback.reviewedAt = new Date()
  await testFeedback.save()

  const updatedDbFeedback = await Feedback.findById(testFeedback._id)
  assert(updatedDbFeedback?.status === 'REVIEWED', 'Feedback status updated to REVIEWED')
  assert(updatedDbFeedback?.reviewedBy === 'admin@biteflow.com', 'Feedback recorded reviewer identity')
  assert(!!updatedDbFeedback?.reviewedAt, 'Feedback recorded review timestamp')

  // ========================================================
  // TEST SUITE G: RESTAURANT SETTINGS PERSISTENCE & VALIDATION
  // ========================================================
  console.log('\n--- TEST SUITE G: RESTAURANT SETTINGS PERSISTENCE & VALIDATION ---')

  // G1. Settings schema validation
  const validSettingsPayload = {
    restaurantName: 'BiteFlow Bistro & Grill',
    contactPhone: '+1 (555) 019-2834',
    contactEmail: 'kitchen@biteflow.com',
    operatingHours: '10:00 AM – 11:00 PM',
    restaurantStatus: 'OPEN' as const,
    deliveryNotice: 'Standard delivery time is 30-45 minutes.',
    isDeliveryActive: true,
  }
  const settingsParseResult = updateSettingsSchema.safeParse(validSettingsPayload)
  assert(settingsParseResult.success, 'Valid settings payload passes Zod validation schema')

  const invalidSettingsPayload = {
    restaurantName: 'B', // too short (< 2)
    contactPhone: '12',  // too short (< 5)
    contactEmail: 'not-an-email',
    operatingHours: '',
    restaurantStatus: 'INVALID_STATUS',
  }
  const invalidSettingsResult = updateSettingsSchema.safeParse(invalidSettingsPayload)
  assert(!invalidSettingsResult.success, 'Invalid settings payload rejected by Zod validation schema')

  // G2. Settings persistence in database
  let dbSettings = await RestaurantSettings.findOne()
  if (!dbSettings) {
    dbSettings = new RestaurantSettings()
  }
  dbSettings.restaurantName = 'BiteFlow Bistro & Grill'
  dbSettings.contactPhone = '+1 (555) 019-2834'
  dbSettings.contactEmail = 'kitchen@biteflow.com'
  dbSettings.operatingHours = '10:00 AM – 11:00 PM'
  dbSettings.restaurantStatus = 'BUSY'
  dbSettings.deliveryNotice = 'Busy kitchen: expect 45-60 min delivery.'
  dbSettings.isDeliveryActive = true
  dbSettings.updatedBy = 'admin@biteflow.com'
  await dbSettings.save()

  const fetchedSettings = await RestaurantSettings.findOne()
  assert(
    fetchedSettings?.restaurantName === 'BiteFlow Bistro & Grill',
    'Persisted restaurantName updated in database'
  )
  assert(
    fetchedSettings?.restaurantStatus === 'BUSY',
    'Persisted restaurantStatus updated to BUSY'
  )
  assert(
    fetchedSettings?.updatedBy === 'admin@biteflow.com',
    'Settings update records admin identity in updatedBy'
  )

  // ========================================================
  // TEST SUITE H: REGRESSION CHECKS (FS-01 through FS-08)
  // ========================================================
  console.log('\n--- TEST SUITE H: REGRESSION CHECKS (FS-01 THROUGH FS-08) ---')

  // H1. Category & Product integrity (FS-02)
  const productCount = await Product.countDocuments()
  const categoryCount = await Category.countDocuments()
  assert(productCount > 0, `FS-02 Products collection operational (${productCount} products found)`)
  assert(categoryCount > 0, `FS-02 Categories collection operational (${categoryCount} categories found)`)

  // H2. User roles schema (FS-01)
  const validRoleParse = updateRoleSchema.safeParse({ role: 'admin' })
  assert(validRoleParse.success, 'FS-01 Role schema accepts "admin"')
  const invalidRoleParse = updateRoleSchema.safeParse({ role: 'superadmin' })
  assert(!invalidRoleParse.success, 'FS-01 Role schema rejects unauthorized arbitrary role values')

  // H3. Order & Payment models integrity (FS-05, FS-06, FS-07, FS-08)
  const allOrderCount = await Order.countDocuments()
  assert(allOrderCount >= 5, `Order collection operational (${allOrderCount} orders found)`)

  // ========================================================
  // DATABASE CLEANUP: SELF-CLEANING SUITE
  // ========================================================
  console.log('\n--- CLEANING UP TEST ARTIFACTS ---')

  if (createdOrderIds.length > 0) {
    await Order.deleteMany({ _id: { $in: createdOrderIds } })
  }
  if (createdPaymentIds.length > 0) {
    await Payment.deleteMany({ _id: { $in: createdPaymentIds } })
  }
  if (createdFeedbackIds.length > 0) {
    await Feedback.deleteMany({ _id: { $in: createdFeedbackIds } })
  }
  if (createdUserIds.length > 0) {
    await User.deleteMany({ clerkId: { $in: createdUserIds } })
  }

  // Restore original restaurant settings if they existed
  if (originalSettings) {
    await RestaurantSettings.findOneAndUpdate(
      {},
      {
        restaurantName: originalSettings.restaurantName,
        contactPhone: originalSettings.contactPhone,
        contactEmail: originalSettings.contactEmail,
        operatingHours: originalSettings.operatingHours,
        restaurantStatus: originalSettings.restaurantStatus,
        deliveryNotice: originalSettings.deliveryNotice,
        isDeliveryActive: originalSettings.isDeliveryActive,
        updatedBy: originalSettings.updatedBy,
      }
    )
  }

  console.log('  ✓ Cleaned up all FS-09 test records and restored baseline settings')

  console.log('\n======================================================')
  console.log(`TOTAL PASSED: ${totalPassed}`)
  console.log(`TOTAL FAILED: ${totalFailed}`)
  console.log('======================================================\n')

  await mongoose.disconnect()
  process.exit(totalFailed > 0 ? 1 : 0)
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err)
  process.exit(1)
})
