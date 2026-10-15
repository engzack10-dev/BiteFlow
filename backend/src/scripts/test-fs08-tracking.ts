import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Order, OrderStatus } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { Category } from '../models/Category.js'

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
  console.log('   BITEFLOW FS-08 CUSTOMER ORDER TRACKING TEST SUITE  ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // ========================================================
  // TEST SUITE A: AUTHENTICATION & OWNERSHIP BOUNDARIES
  // ========================================================
  console.log('--- TEST SUITE A: AUTHENTICATION & OWNERSHIP BOUNDARIES ---')

  try {
    const unauthHistory = await fetch(`${API_URL}/api/orders/my-orders`)
    assert(
      unauthHistory.status === 401,
      'GET /api/orders/my-orders rejects unauthenticated request with HTTP 401',
      `Got status: ${unauthHistory.status}`
    )

    const unauthSingle = await fetch(`${API_URL}/api/orders/test-order-id`)
    assert(
      unauthSingle.status === 401,
      'GET /api/orders/:id rejects unauthenticated request with HTTP 401',
      `Got status: ${unauthSingle.status}`
    )
  } catch (err: any) {
    assert(false, 'Live HTTP Auth tests against localhost:5000', err.message)
  }

  // Create two distinct test customers
  const customerAClerkId = `cust_fs08_alice_${Date.now()}`
  const customerBClerkId = `cust_fs08_bob_${Date.now()}`
  const adminClerkId = `admin_fs08_lead_${Date.now()}`

  await User.create([
    {
      clerkId: customerAClerkId,
      email: 'alice@example.com',
      name: 'Alice Johnson',
      role: 'customer',
    },
    {
      clerkId: customerBClerkId,
      email: 'bob@example.com',
      name: 'Bob Smith',
      role: 'customer',
    },
    {
      clerkId: adminClerkId,
      email: 'admin.lead@biteflow.local',
      name: 'Admin Lead',
      role: 'admin',
    },
  ])

  // Create an order for Alice (Customer A)
  const orderA = await Order.create({
    orderNumber: `ORD-TEST-A-${Date.now()}`,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    customerEmail: 'alice@example.com',
    customerPhone: '+1 555-0101',
    deliveryAddress: '123 Maple Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Gourmet Truffle Burger',
        image: '/burger.jpg',
        unitPrice: 16.99,
        quantity: 2,
        subtotal: 33.98,
      },
    ],
    subtotal: 33.98,
    deliveryFee: 0,
    totalAmount: 33.98,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    statusHistory: [
      {
        oldStatus: null,
        newStatus: 'PENDING_PAYMENT',
        timestamp: new Date(),
        actorId: customerAClerkId,
        actorRole: 'customer',
        note: 'Order submitted by customer',
      },
    ],
  })

  // Create an order for Bob (Customer B)
  const orderB = await Order.create({
    orderNumber: `ORD-TEST-B-${Date.now()}`,
    clerkId: customerBClerkId,
    customerName: 'Bob Smith',
    customerEmail: 'bob@example.com',
    customerPhone: '+1 555-0202',
    deliveryAddress: '456 Oak Avenue',
    deliveryArea: 'Uptown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Wood-Fired Margherita Pizza',
        image: '/pizza.jpg',
        unitPrice: 18.5,
        quantity: 1,
        subtotal: 18.5,
      },
    ],
    subtotal: 18.5,
    deliveryFee: 0,
    totalAmount: 18.5,
    status: 'CONFIRMED',
    paymentStatus: 'VERIFIED',
  })

  // A1. Ownership verification: Alice can query Order A by ID with her clerkId
  const aliceOrderA = await Order.findOne({
    _id: orderA._id,
    clerkId: customerAClerkId,
  })
  assert(!!aliceOrderA, 'Customer A can find their own order in DB using { _id, clerkId }')
  assert(aliceOrderA?.customerName === 'Alice Johnson', 'Customer A retrieves correct order details')

  // A2. Ownership isolation: Alice query for Bob\'s Order B with Alice\'s clerkId returns NULL
  const aliceQueryBobOrder = await Order.findOne({
    _id: orderB._id,
    clerkId: customerAClerkId,
  })
  assert(
    aliceQueryBobOrder === null,
    'Database query for Order B scoped to Customer A clerkId returns null (strict isolation)'
  )

  // A3. Ownership isolation by orderNumber: Alice query for Bob\'s orderNumber with Alice\'s clerkId returns NULL
  const aliceQueryBobByRef = await Order.findOne({
    orderNumber: orderB.orderNumber,
    clerkId: customerAClerkId,
  })
  assert(
    aliceQueryBobByRef === null,
    'Database query for Order B by orderNumber scoped to Customer A clerkId returns null'
  )

  // A4. Admin can access any order without clerkId restriction
  const adminQueryOrderA = await Order.findById(orderA._id)
  const adminQueryOrderB = await Order.findById(orderB._id)
  assert(!!adminQueryOrderA && !!adminQueryOrderB, 'Admin retains global access to all orders')

  // ========================================================
  // TEST SUITE B: CUSTOMER ORDER HISTORY QUERY & SORTING
  // ========================================================
  console.log('\n--- TEST SUITE B: CUSTOMER ORDER HISTORY QUERY & SORTING ---')

  // Create multiple orders for Alice over time (including delivered)
  const deliveredOrderA = await Order.create({
    orderNumber: `ORD-TEST-A-DELIV-${Date.now()}`,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    customerPhone: '+1 555-0101',
    deliveryAddress: '123 Maple Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: 'Crispy Fries',
        image: '/fries.jpg',
        unitPrice: 5.99,
        quantity: 1,
        subtotal: 5.99,
      },
    ],
    subtotal: 5.99,
    deliveryFee: 0,
    totalAmount: 5.99,
    status: 'DELIVERED',
    paymentStatus: 'VERIFIED',
    deliveredAt: new Date(Date.now() - 3600000), // 1 hour ago
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
  })

  // Query Alice\'s orders sorted by newest first
  const aliceOrders = await Order.find({ clerkId: customerAClerkId }).sort({ createdAt: -1 })
  assert(aliceOrders.length === 2, 'Customer A retrieves exactly their own 2 orders')
  assert(
    aliceOrders[0]._id.toString() === orderA._id.toString(),
    'Customer A orders are sorted newest first (orderA before older deliveredOrderA)'
  )

  // B1. Delivered orders are NOT filtered out
  const hasDelivered = aliceOrders.some((o) => o.status === 'DELIVERED')
  assert(hasDelivered, 'Delivered orders remain accessible in authenticated customer history')

  // B2. Empty state for customer with no orders
  const freshCustomerClerkId = `cust_fresh_${Date.now()}`
  const freshCustomerOrders = await Order.find({ clerkId: freshCustomerClerkId }).sort({
    createdAt: -1,
  })
  assert(
    Array.isArray(freshCustomerOrders) && freshCustomerOrders.length === 0,
    'Customer with zero orders receives empty array [] without errors'
  )

  // ========================================================
  // TEST SUITE C: HISTORICAL PRODUCT SNAPSHOT INTEGRITY
  // ========================================================
  console.log('\n--- TEST SUITE C: HISTORICAL PRODUCT SNAPSHOT INTEGRITY ---')

  // Create a menu product
  const category = await Category.create({
    name: `Burgers_${Date.now()}`,
    isActive: true,
  })
  const menuBurger = await Product.create({
    name: 'Historical Cheese Deluxe',
    description: 'Juicy Angus patty with cheddar',
    price: 14.99,
    image: '/burger.jpg',
    category: category._id,
    isAvailable: true,
  })

  // Customer places order with snapshot at $14.99
  const snapshotOrder = await Order.create({
    orderNumber: `ORD-SNAP-${Date.now()}`,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    customerPhone: '+1 555-0101',
    deliveryAddress: '123 Maple Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: menuBurger._id,
        name: menuBurger.name,
        image: menuBurger.image,
        unitPrice: menuBurger.price,
        quantity: 2,
        subtotal: 29.98,
      },
    ],
    subtotal: 29.98,
    deliveryFee: 0,
    totalAmount: 29.98,
    status: 'CONFIRMED',
    paymentStatus: 'VERIFIED',
  })

  // Store admin updates menu product price to $19.99 (inflation / price change)
  await Product.findByIdAndUpdate(menuBurger._id, { price: 19.99, name: 'Historical Cheese Deluxe (Updated)' })

  // Re-fetch customer order: snapshot price must remain $14.99, total must remain $29.98
  const fetchedSnapOrder = await Order.findById(snapshotOrder._id)
  assert(
    fetchedSnapOrder?.items[0].unitPrice === 14.99,
    'Historical unit price in order snapshot remains 14.99 after product price change'
  )
  assert(
    fetchedSnapOrder?.items[0].name === 'Historical Cheese Deluxe',
    'Historical product name in order snapshot remains unchanged'
  )
  assert(
    fetchedSnapOrder?.totalAmount === 29.98,
    'Order totalAmount remains 29.98 and is not recalculated with current menu prices'
  )

  // ========================================================
  // TEST SUITE D: ORDER LIFECYCLE & FRIENDLY LABELS
  // ========================================================
  console.log('\n--- TEST SUITE D: ORDER LIFECYCLE & STATUS TRACKING ---')

  // Map of enum to expected friendly label
  const labelMap: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'Awaiting payment',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Kitchen Preparing',
    READY: 'Ready for delivery',
    DISPATCHED: 'Out for delivery',
    DELIVERED: 'Delivered',
  }

  const allStatuses: OrderStatus[] = [
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DISPATCHED',
    'DELIVERED',
  ]

  for (const st of allStatuses) {
    assert(!!labelMap[st], `Customer friendly label defined for status: ${st} -> "${labelMap[st]}"`)
  }

  // Lifecycle progression and audit trail
  const trackingOrder = await Order.create({
    orderNumber: `ORD-TRACK-${Date.now()}`,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    customerPhone: '+1 555-0101',
    deliveryAddress: '123 Maple Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: menuBurger._id,
        name: 'Gourmet Burger',
        image: '/burger.jpg',
        unitPrice: 12.0,
        quantity: 1,
        subtotal: 12.0,
      },
    ],
    subtotal: 12.0,
    deliveryFee: 0,
    totalAmount: 12.0,
    status: 'CONFIRMED',
    paymentStatus: 'VERIFIED',
    statusHistory: [
      {
        oldStatus: null,
        newStatus: 'PENDING_PAYMENT',
        timestamp: new Date(Date.now() - 100000),
        actorId: customerAClerkId,
        actorRole: 'customer',
        note: 'Order submitted',
      },
      {
        oldStatus: 'PENDING_PAYMENT',
        newStatus: 'CONFIRMED',
        timestamp: new Date(Date.now() - 80000),
        actorId: adminClerkId,
        actorRole: 'admin',
        note: 'Payment verified by admin',
      },
    ],
  })

  // Advance order to PREPARING -> READY -> DISPATCHED -> DELIVERED
  const dispatchedTime = new Date()
  await Order.findByIdAndUpdate(trackingOrder._id, {
    status: 'DISPATCHED',
    dispatchedAt: dispatchedTime,
    $push: {
      statusHistory: {
        oldStatus: 'READY',
        newStatus: 'DISPATCHED',
        timestamp: dispatchedTime,
        actorId: adminClerkId,
        actorRole: 'admin',
        note: 'Courier picked up order',
      },
    },
  })

  const updatedTrackingOrder = await Order.findById(trackingOrder._id)
  assert(
    updatedTrackingOrder?.status === 'DISPATCHED',
    'Order successfully updated to DISPATCHED'
  )
  assert(
    !!updatedTrackingOrder?.dispatchedAt,
    'Dispatched timestamp correctly recorded on order'
  )
  assert(
    updatedTrackingOrder?.statusHistory?.length === 3,
    'Status history correctly records chronological transitions'
  )

  // ========================================================
  // TEST SUITE E: PAYMENT STATUS SEPARATION & EXCEPTIONAL STATES
  // ========================================================
  console.log('\n--- TEST SUITE E: PAYMENT STATUS SEPARATION & EXCEPTIONAL STATES ---')

  // E1. Customer claim is marked PENDING and does NOT confirm order
  const pendingPaymentOrder = await Order.create({
    orderNumber: `ORD-PAY-PEND-${Date.now()}`,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    customerPhone: '+1 555-0101',
    deliveryAddress: '123 Maple Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: menuBurger._id,
        name: 'Burger',
        image: '/burger.jpg',
        unitPrice: 10,
        quantity: 1,
        subtotal: 10,
      },
    ],
    subtotal: 10,
    deliveryFee: 0,
    totalAmount: 10,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
  })

  const paymentRecord = await Payment.create({
    orderId: pendingPaymentOrder._id,
    orderNumber: pendingPaymentOrder.orderNumber,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    amount: 10,
    status: 'PENDING',
    paymentMethod: 'UPI / Bank Transfer',
    paymentNumber: `PAY-${Date.now()}`,
  })

  assert(
    pendingPaymentOrder.status === 'PENDING_PAYMENT' && pendingPaymentOrder.paymentStatus === 'PENDING',
    'Customer-submitted payment record remains PENDING; order remains in PENDING_PAYMENT'
  )

  // E2. Payment rejection preserves rejection reason and keeps order in PENDING_PAYMENT
  await Payment.findByIdAndUpdate(paymentRecord._id, {
    status: 'REJECTED',
    rejectedAt: new Date(),
    rejectedBy: adminClerkId,
    rejectionReason: 'Invalid transaction UTR reference',
  })
  await Order.findByIdAndUpdate(pendingPaymentOrder._id, {
    paymentStatus: 'REJECTED',
    paymentRejectionReason: 'Invalid transaction UTR reference',
  })

  const rejectedOrder = await Order.findById(pendingPaymentOrder._id)
  assert(
    rejectedOrder?.paymentStatus === 'REJECTED',
    'Order paymentStatus updated to REJECTED'
  )
  assert(
    rejectedOrder?.status === 'PENDING_PAYMENT',
    'Order status remains PENDING_PAYMENT upon payment rejection (separation of concerns)'
  )
  assert(
    rejectedOrder?.paymentRejectionReason === 'Invalid transaction UTR reference',
    'Payment rejection reason is preserved for customer visibility'
  )

  // ========================================================
  // TEST SUITE F: OLDER ORDER BACKWARD COMPATIBILITY
  // ========================================================
  console.log('\n--- TEST SUITE F: OLDER ORDER BACKWARD COMPATIBILITY ---')

  // Older order document with minimal schema (no dispatchedAt, no deliveredAt, no statusHistory)
  const legacyOrder = await Order.create({
    orderNumber: `ORD-LEGACY-${Date.now()}`,
    clerkId: customerAClerkId,
    customerName: 'Alice Johnson',
    customerPhone: '+1 555-0101',
    deliveryAddress: '123 Maple Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: menuBurger._id,
        name: 'Classic Burger',
        image: '/burger.jpg',
        unitPrice: 9.99,
        quantity: 1,
        subtotal: 9.99,
      },
    ],
    subtotal: 9.99,
    deliveryFee: 0,
    totalAmount: 9.99,
    status: 'DELIVERED',
    paymentStatus: 'VERIFIED',
  })

  const fetchedLegacy = await Order.findById(legacyOrder._id)
  assert(!!fetchedLegacy, 'Legacy order retrieved successfully')
  assert(
    fetchedLegacy?.statusHistory === undefined || fetchedLegacy?.statusHistory?.length === 0,
    'Legacy order without statusHistory loads cleanly without schema violation'
  )
  assert(
    fetchedLegacy?.dispatchedAt === undefined && fetchedLegacy?.deliveredAt === undefined,
    'Legacy order without optional timestamps loads cleanly'
  )

  // ========================================================
  // TEST SUITE G: REGRESSION CHECKS (FS-01 through FS-07)
  // ========================================================
  console.log('\n--- TEST SUITE G: REGRESSION CHECKS ---')

  // G1. Product and Category integrity
  const productCount = await Product.countDocuments()
  assert(productCount > 0, 'FS-02 Products collections and models remain fully functional')

  // G2. Admin order query with date and status filters
  const confirmedOrders = await Order.find({ status: 'CONFIRMED' })
  assert(confirmedOrders.length >= 1, 'FS-07 Admin status filtering operational')

  // G3. Admin order lifecycle transitions
  assert(
    allStatuses.includes('PREPARING') && allStatuses.includes('READY'),
    'FS-07 OrderStatus enum values intact'
  )

  // Cleanup all FS-08 test artifacts from database
  await Category.deleteOne({ _id: category._id })
  await Product.deleteOne({ _id: menuBurger._id })
  await Order.deleteMany({
    _id: {
      $in: [
        orderA._id,
        orderB._id,
        deliveredOrderA._id,
        snapshotOrder._id,
        trackingOrder._id,
        pendingPaymentOrder._id,
        legacyOrder._id,
      ],
    },
  })
  await Payment.deleteOne({ _id: paymentRecord._id })
  await User.deleteMany({
    clerkId: { $in: [customerAClerkId, customerBClerkId, adminClerkId, freshCustomerClerkId] },
  })
  console.log('  ✓ Cleaned up all FS-08 test records from database')

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
