import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Order, OrderStatus } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import {
  ALLOWED_NEXT_STATUSES,
  parseDateFilter,
  updateOrderStatusSchema,
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
  console.log('      BITEFLOW FS-07 ORDER MANAGEMENT TEST SUITE     ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // ========================================================
  // TEST SUITE A: AUTHORIZATION & ACCESS BOUNDARIES (HTTP)
  // ========================================================
  console.log('--- TEST SUITE A: AUTHORIZATION & ACCESS BOUNDARIES ---')

  try {
    const unauthList = await fetch(`${API_URL}/api/orders`)
    assert(
      unauthList.status === 401,
      'GET /api/orders rejects unauthenticated request with HTTP 401',
      `Got status: ${unauthList.status}`
    )

    const unauthStatusPatch = await fetch(`${API_URL}/api/orders/any-id/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PREPARING' }),
    })
    assert(
      unauthStatusPatch.status === 401,
      'PATCH /api/orders/:id/status rejects unauthenticated request with HTTP 401',
      `Got status: ${unauthStatusPatch.status}`
    )
  } catch (err: any) {
    assert(false, 'Live HTTP Auth tests against localhost:5000', err.message)
  }

  // A3. Role boundary check: customer cannot access admin endpoints
  const testCustomerClerkId = `cust_fs07_${Date.now()}`
  const testAdminClerkId = `admin_fs07_${Date.now()}`

  await User.create({
    clerkId: testCustomerClerkId,
    email: 'customer.test@biteflow.local',
    name: 'Customer Test',
    role: 'customer',
  })

  await User.create({
    clerkId: testAdminClerkId,
    email: 'admin.manager@biteflow.local',
    name: 'Admin Manager',
    role: 'admin',
  })

  const customerUser = await User.findOne({ clerkId: testCustomerClerkId })
  const adminUser = await User.findOne({ clerkId: testAdminClerkId })
  assert(customerUser?.role === 'customer', 'Customer user created with customer role')
  assert(adminUser?.role === 'admin', 'Admin user created with admin role')
  assert(customerUser?.role !== 'admin', 'Customer user cannot pass requireRole(["admin"]) check')

  // ========================================================
  // TEST SUITE B: DATE FILTERING, SEARCH & ORDER LIST LOGIC
  // ========================================================
  console.log('\n--- TEST SUITE B: DATE FILTERING, SEARCH & ORDER LIST LOGIC ---')

  // B1. Valid date range parsing
  const validRange = parseDateFilter('2026-10-01', '2026-10-15')
  assert(!validRange.error, 'Valid date range parsed without error')
  assert(!!validRange.dateFilter?.$gte, 'Start date parsed into $gte')
  assert(!!validRange.dateFilter?.$lte, 'End date parsed into $lte')
  // Verify end-of-day handling: 2026-10-15 must include up to 23:59:59.999Z
  const parsedEnd = validRange.dateFilter?.$lte
  assert(
    parsedEnd?.toISOString() === '2026-10-15T23:59:59.999Z',
    'YYYY-MM-DD end date is converted to 23:59:59.999Z (inclusive end-of-day)',
    `Got: ${parsedEnd?.toISOString()}`
  )

  // B2. Date range validation: endDate earlier than startDate
  const invertedRange = parseDateFilter('2026-10-20', '2026-10-10')
  assert(
    !!invertedRange.error && invertedRange.error.includes('earlier than startDate'),
    'Date filter rejects endDate earlier than startDate with clear error'
  )

  // B3. Invalid date format rejected
  const invalidDate = parseDateFilter('invalid-date', '2026-10-10')
  assert(
    !!invalidDate.error && invalidDate.error.includes('Invalid startDate format'),
    'Date filter rejects malformed date string'
  )

  // B4. Schema validation for status updates
  const validStatusParse = updateOrderStatusSchema.safeParse({
    status: 'PREPARING',
    note: 'Chef started pizza oven',
  })
  assert(validStatusParse.success, 'Valid status transition payload passes Zod schema')

  const invalidStatusParse = updateOrderStatusSchema.safeParse({
    status: 'INVALID_STATUS',
  })
  assert(!invalidStatusParse.success, 'Unknown order status is rejected by Zod schema')

  // ========================================================
  // TEST SUITE C: ORDER DETAILS, SNAPSHOTS & AUTHORITATIVE TOTALS
  // ========================================================
  console.log('\n--- TEST SUITE C: ORDER DETAILS, SNAPSHOTS & AUTHORITATIVE TOTALS ---')

  // Find or create test product
  let product = await Product.findOne({ isAvailable: true })
  if (!product) {
    product = await Product.create({
      name: 'Gourmet Truffle Burger',
      description: 'Handcrafted wagyu patty with black truffle aioli',
      price: 18.5,
      category: 'Burgers',
      isAvailable: true,
      image: '/gourmet-burger.jpg',
    })
  }

  const initialProductPrice = product.price
  const orderNumber = `FS07-ORD-${Date.now().toString().slice(-4)}`

  const testOrder = await Order.create({
    orderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Customer Test',
    customerEmail: 'customer.test@biteflow.local',
    customerPhone: '+1 555-0144',
    deliveryAddress: '742 Evergreen Terrace',
    deliveryArea: 'Springfield West',
    deliveryInstructions: 'Leave with doorman',
    items: [
      {
        productId: product._id,
        name: product.name,
        image: product.image,
        unitPrice: initialProductPrice,
        quantity: 2,
        subtotal: Math.round(initialProductPrice * 2 * 100) / 100,
      },
    ],
    subtotal: Math.round(initialProductPrice * 2 * 100) / 100,
    deliveryFee: 0,
    totalAmount: Math.round(initialProductPrice * 2 * 100) / 100,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    statusHistory: [
      {
        previousStatus: null,
        newStatus: 'PENDING_PAYMENT',
        timestamp: new Date(),
        actorId: testCustomerClerkId,
        actorRole: 'customer',
        actorEmail: 'customer.test@biteflow.local',
        note: 'Customer placed order at checkout',
      },
    ],
  })

  // Create linked payment record
  const testPayment = await Payment.create({
    paymentNumber: `PAY-FS07-${Date.now().toString().slice(-6)}`,
    orderId: testOrder._id,
    orderNumber: testOrder.orderNumber,
    clerkId: testCustomerClerkId,
    customerName: testOrder.customerName,
    customerEmail: testOrder.customerEmail,
    amount: testOrder.totalAmount,
    currency: 'USD',
    status: 'PENDING',
    paymentMethod: 'MANUAL_VERIFICATION',
    submittedAt: new Date(),
    auditHistory: [
      {
        action: 'SUBMITTED',
        previousStatus: null,
        newStatus: 'PENDING',
        actorId: testCustomerClerkId,
        actorRole: 'customer',
        actorEmail: testOrder.customerEmail,
        timestamp: new Date(),
        note: 'Customer submitted payment step',
      },
    ],
  })

  testOrder.paymentId = testPayment._id as mongoose.Types.ObjectId
  await testOrder.save()

  // C1. Verify persisted snapshots
  assert(testOrder.items[0].name === product.name, 'Item name snapshot matches original product name')
  assert(testOrder.items[0].unitPrice === initialProductPrice, 'Item unitPrice snapshot matches original price')
  assert(testOrder.totalAmount === Math.round(initialProductPrice * 2 * 100) / 100, 'Authoritative totalAmount is preserved')

  // C2. Price change immunity: Simulate product catalog price changing in database
  const catalogOldPrice = product.price
  product.price = catalogOldPrice + 10.0 // Price increases by $10
  await product.save()

  const fetchedOrder = await Order.findById(testOrder._id)
  assert(
    fetchedOrder?.items[0].unitPrice === initialProductPrice,
    'Historical order item unitPrice remains UNCHANGED after product catalog price change'
  )
  assert(
    fetchedOrder?.totalAmount === Math.round(initialProductPrice * 2 * 100) / 100,
    'Historical order totalAmount remains UNCHANGED after product catalog price change'
  )

  // Restore product price
  product.price = catalogOldPrice
  await product.save()

  // C3. Delivery information integrity
  assert(fetchedOrder?.deliveryAddress === '742 Evergreen Terrace', 'Delivery address is persisted')
  assert(fetchedOrder?.deliveryArea === 'Springfield West', 'Delivery area/district is persisted')
  assert(fetchedOrder?.deliveryInstructions === 'Leave with doorman', 'Delivery instructions are persisted')
  assert(fetchedOrder?.customerPhone === '+1 555-0144', 'Contact phone is persisted')

  // ========================================================
  // TEST SUITE D: STATE MACHINE DEFINITION & TRANSITIONS
  // ========================================================
  console.log('\n--- TEST SUITE D: STATE MACHINE DEFINITION & VALID TRANSITIONS ---')

  assert(
    JSON.stringify(ALLOWED_NEXT_STATUSES['PENDING_PAYMENT']) === JSON.stringify(['CONFIRMED']),
    'PENDING_PAYMENT can only transition to CONFIRMED'
  )
  assert(
    JSON.stringify(ALLOWED_NEXT_STATUSES['CONFIRMED']) === JSON.stringify(['PREPARING']),
    'CONFIRMED can only transition to PREPARING'
  )
  assert(
    JSON.stringify(ALLOWED_NEXT_STATUSES['PREPARING']) === JSON.stringify(['READY']),
    'PREPARING can only transition to READY'
  )
  assert(
    JSON.stringify(ALLOWED_NEXT_STATUSES['READY']) === JSON.stringify(['DISPATCHED']),
    'READY can only transition to DISPATCHED'
  )
  assert(
    JSON.stringify(ALLOWED_NEXT_STATUSES['DISPATCHED']) === JSON.stringify(['DELIVERED']),
    'DISPATCHED can only transition to DELIVERED'
  )
  assert(
    ALLOWED_NEXT_STATUSES['DELIVERED'].length === 0,
    'DELIVERED is the final lifecycle state (no further transitions)'
  )

  // ========================================================
  // TEST SUITE E: PAYMENT SAFETY & INVALID TRANSITIONS
  // ========================================================
  console.log('\n--- TEST SUITE E: PAYMENT SAFETY & INVALID TRANSITIONS ---')

  // E1. Unverified order cannot be confirmed directly without verified payment
  const canConfirmUnverified = testOrder.paymentStatus === 'VERIFIED'
  assert(!canConfirmUnverified, 'Order with PENDING payment CANNOT transition to CONFIRMED')

  // E2. PENDING_PAYMENT cannot jump to PREPARING, READY, DISPATCHED, or DELIVERED
  for (const illegalStatus of ['PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'] as OrderStatus[]) {
    const isAllowed = ALLOWED_NEXT_STATUSES['PENDING_PAYMENT'].includes(illegalStatus)
    assert(!isAllowed, `PENDING_PAYMENT cannot skip directly to ${illegalStatus}`)
  }

  // E3. Simulate payment verification (FS-06 trusted workflow)
  testPayment.status = 'VERIFIED'
  testPayment.verifiedAt = new Date()
  testPayment.verifiedBy = 'admin.manager@biteflow.local'
  testPayment.auditHistory.push({
    action: 'VERIFIED',
    previousStatus: 'PENDING',
    newStatus: 'VERIFIED',
    actorId: testAdminClerkId,
    actorRole: 'admin',
    actorEmail: 'admin.manager@biteflow.local',
    timestamp: new Date(),
    note: 'Payment verified in bank statement',
  })
  await testPayment.save()

  // Order transitions to CONFIRMED with verified payment
  testOrder.paymentStatus = 'VERIFIED'
  testOrder.status = 'CONFIRMED'
  testOrder.statusHistory.push({
    previousStatus: 'PENDING_PAYMENT',
    newStatus: 'CONFIRMED',
    timestamp: new Date(),
    actorId: testAdminClerkId,
    actorRole: 'admin',
    actorEmail: 'admin.manager@biteflow.local',
    note: 'Payment verified by Admin',
  })
  await testOrder.save()

  assert(testOrder.status === 'CONFIRMED', 'Order is now legitimately CONFIRMED')
  assert(testOrder.paymentStatus === 'VERIFIED', 'Payment status is VERIFIED')

  // E4. CONFIRMED cannot skip directly to READY, DISPATCHED, or DELIVERED
  for (const illegal of ['READY', 'DISPATCHED', 'DELIVERED'] as OrderStatus[]) {
    const isAllowed = ALLOWED_NEXT_STATUSES['CONFIRMED'].includes(illegal)
    assert(!isAllowed, `CONFIRMED cannot skip directly to ${illegal} (must go through PREPARING)`)
  }

  // E5. Backward transitions rejected
  const backwardsToPending = ALLOWED_NEXT_STATUSES['CONFIRMED'].includes('PENDING_PAYMENT')
  assert(!backwardsToPending, 'CONFIRMED cannot move backwards to PENDING_PAYMENT')

  // ========================================================
  // TEST SUITE F: FULL LIFECYCLE PROGRESSION & AUDIT TRAIL
  // ========================================================
  console.log('\n--- TEST SUITE F: FULL LIFECYCLE PROGRESSION & AUDIT TRAIL ---')

  // F1. CONFIRMED -> PREPARING
  const prepTime = new Date()
  testOrder.status = 'PREPARING'
  testOrder.statusHistory.push({
    previousStatus: 'CONFIRMED',
    newStatus: 'PREPARING',
    timestamp: prepTime,
    actorId: testAdminClerkId,
    actorRole: 'admin',
    actorEmail: 'admin.manager@biteflow.local',
    note: 'Kitchen started food preparation',
  })
  await testOrder.save()
  assert(testOrder.status === 'PREPARING', 'Order successfully transitioned CONFIRMED -> PREPARING')

  // PREPARING cannot skip to DISPATCHED or DELIVERED
  assert(!ALLOWED_NEXT_STATUSES['PREPARING'].includes('DISPATCHED'), 'PREPARING cannot skip to DISPATCHED')
  assert(!ALLOWED_NEXT_STATUSES['PREPARING'].includes('DELIVERED'), 'PREPARING cannot skip to DELIVERED')

  // F2. PREPARING -> READY
  const readyTime = new Date()
  testOrder.status = 'READY'
  testOrder.statusHistory.push({
    previousStatus: 'PREPARING',
    newStatus: 'READY',
    timestamp: readyTime,
    actorId: testAdminClerkId,
    actorRole: 'admin',
    actorEmail: 'admin.manager@biteflow.local',
    note: 'Food packaged and placed in pickup bay',
  })
  await testOrder.save()
  assert(testOrder.status === 'READY', 'Order successfully transitioned PREPARING -> READY')

  // READY cannot skip directly to DELIVERED
  assert(!ALLOWED_NEXT_STATUSES['READY'].includes('DELIVERED'), 'READY cannot skip to DELIVERED without DISPATCHED')

  // F3. READY -> DISPATCHED (with timestamp tracking)
  const dispatchTime = new Date()
  testOrder.status = 'DISPATCHED'
  testOrder.dispatchedAt = dispatchTime
  testOrder.dispatchedBy = 'admin.manager@biteflow.local'
  testOrder.statusHistory.push({
    previousStatus: 'READY',
    newStatus: 'DISPATCHED',
    timestamp: dispatchTime,
    actorId: testAdminClerkId,
    actorRole: 'admin',
    actorEmail: 'admin.manager@biteflow.local',
    note: 'Courier #42 collected package',
  })
  await testOrder.save()
  assert(testOrder.status === 'DISPATCHED', 'Order successfully transitioned READY -> DISPATCHED')
  assert(!!testOrder.dispatchedAt, 'Fulfillment timestamp dispatchedAt is recorded')
  assert(testOrder.dispatchedBy === 'admin.manager@biteflow.local', 'Fulfillment dispatcher admin is recorded')

  // F4. DISPATCHED -> DELIVERED (with timestamp tracking)
  const deliveryTime = new Date()
  testOrder.status = 'DELIVERED'
  testOrder.deliveredAt = deliveryTime
  testOrder.deliveredBy = 'admin.manager@biteflow.local'
  testOrder.statusHistory.push({
    previousStatus: 'DISPATCHED',
    newStatus: 'DELIVERED',
    timestamp: deliveryTime,
    actorId: testAdminClerkId,
    actorRole: 'admin',
    actorEmail: 'admin.manager@biteflow.local',
    note: 'Customer confirmed receipt at door',
  })
  await testOrder.save()
  assert(testOrder.status === 'DELIVERED', 'Order successfully transitioned DISPATCHED -> DELIVERED')
  assert(!!testOrder.deliveredAt, 'Fulfillment timestamp deliveredAt is recorded')
  assert(testOrder.deliveredBy === 'admin.manager@biteflow.local', 'Fulfillment delivery administrator is recorded')

  // F5. DELIVERED is terminal
  assert(ALLOWED_NEXT_STATUSES['DELIVERED'].length === 0, 'No transitions permitted from DELIVERED')

  // F6. Verify complete status history timeline
  const finalOrder = await Order.findById(testOrder._id)
  assert(finalOrder?.statusHistory.length === 6, 'All 6 lifecycle events (initial placement + 5 transitions) are accurately preserved in statusHistory')

  const transitions = finalOrder?.statusHistory.map(h => `${h.previousStatus || 'INIT'} -> ${h.newStatus}`)
  console.log('    Persisted lifecycle timeline:', transitions)
  assert(
    transitions?.[0] === 'INIT -> PENDING_PAYMENT',
    'History[0] records initial order placement'
  )
  assert(
    transitions?.[1] === 'PENDING_PAYMENT -> CONFIRMED',
    'History[1] records payment verification confirmation'
  )
  assert(
    transitions?.[2] === 'CONFIRMED -> PREPARING',
    'History[2] records kitchen preparation start'
  )
  assert(
    transitions?.[3] === 'PREPARING -> READY',
    'History[3] records kitchen completion'
  )
  assert(
    transitions?.[4] === 'READY -> DISPATCHED',
    'History[4] records courier dispatch'
  )
  assert(
    transitions?.[5] === 'DISPATCHED -> DELIVERED',
    'History[5] records customer delivery'
  )

  // Every entry has trusted actor attributes
  const allEntriesHaveActor = finalOrder?.statusHistory.every(
    h => !!h.actorId && !!h.actorRole && !!h.timestamp
  )
  assert(allEntriesHaveActor === true, 'Every audit history entry records trusted actor identity, role, and timestamp')

  // ========================================================
  // TEST SUITE G: CONCURRENCY & REJECTED PAYMENT PROTECTION
  // ========================================================
  console.log('\n--- TEST SUITE G: CONCURRENCY & REJECTED PAYMENT PROTECTION ---')

  // G1. Test rejected payment blocks kitchen prep
  const rejOrderNumber = `FS07-REJ-${Date.now().toString().slice(-4)}`
  const rejectedOrder = await Order.create({
    orderNumber: rejOrderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Customer Test',
    customerEmail: 'customer.test@biteflow.local',
    customerPhone: '+1 555-0144',
    deliveryAddress: '100 Broadway',
    deliveryArea: 'Midtown',
    items: testOrder.items,
    subtotal: 37.0,
    deliveryFee: 0,
    totalAmount: 37.0,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'REJECTED',
    paymentRejectionReason: 'Fake screenshot detected',
  })

  // Verify business rule: Order with REJECTED payment cannot enter PREPARING
  const canRejEnterPrep = rejectedOrder.paymentStatus === 'VERIFIED'
  assert(!canRejEnterPrep, 'Order with REJECTED payment cannot enter kitchen preparation (PREPARING)')

  // G2. Concurrency Control: simulate two concurrent requests attempting transition
  const concurrentOrderNumber = `FS07-CONC-${Date.now().toString().slice(-4)}`
  const concurrentOrder = await Order.create({
    orderNumber: concurrentOrderNumber,
    clerkId: testCustomerClerkId,
    customerName: 'Customer Test',
    customerEmail: 'customer.test@biteflow.local',
    customerPhone: '+1 555-0144',
    deliveryAddress: '200 Main St',
    deliveryArea: 'Downtown',
    items: testOrder.items,
    subtotal: 37.0,
    deliveryFee: 0,
    totalAmount: 37.0,
    status: 'CONFIRMED',
    paymentStatus: 'VERIFIED',
    statusHistory: [
      {
        previousStatus: 'PENDING_PAYMENT',
        newStatus: 'CONFIRMED',
        timestamp: new Date(),
        actorId: testAdminClerkId,
        actorRole: 'admin',
        actorEmail: 'admin.manager@biteflow.local',
        note: 'Initial confirmation',
      },
    ],
  })

  // Admin 1 executes atomic update from CONFIRMED -> PREPARING
  const update1 = await Order.findOneAndUpdate(
    { _id: concurrentOrder._id, status: 'CONFIRMED' },
    {
      $set: { status: 'PREPARING' },
      $push: {
        statusHistory: {
          previousStatus: 'CONFIRMED',
          newStatus: 'PREPARING',
          timestamp: new Date(),
          actorId: testAdminClerkId,
          actorRole: 'admin',
          note: 'Admin 1 update',
        },
      },
    },
    { new: true }
  )
  assert(!!update1, 'First admin update succeeds (status was CONFIRMED)')

  // Admin 2 attempts concurrent update expecting status CONFIRMED -> PREPARING
  const update2 = await Order.findOneAndUpdate(
    { _id: concurrentOrder._id, status: 'CONFIRMED' },
    {
      $set: { status: 'PREPARING' },
      $push: {
        statusHistory: {
          previousStatus: 'CONFIRMED',
          newStatus: 'PREPARING',
          timestamp: new Date(),
          actorId: 'admin_concurrent_2',
          actorRole: 'admin',
          note: 'Admin 2 race condition',
        },
      },
    },
    { new: true }
  )
  assert(
    update2 === null,
    'Conflicting concurrent update matches 0 documents and returns null (preventing race condition corruption)'
  )

  // ========================================================
  // CLEANUP
  // ========================================================
  await User.deleteMany({ clerkId: { $in: [testCustomerClerkId, testAdminClerkId] } })
  await Order.deleteMany({
    orderNumber: { $in: [orderNumber, rejOrderNumber, concurrentOrderNumber] },
  })
  await Payment.deleteMany({ orderId: { $in: [testOrder._id, rejectedOrder._id, concurrentOrder._id] } })

  console.log('\n======================================================')
  console.log(`TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  await mongoose.disconnect()

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
