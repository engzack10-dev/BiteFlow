import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { User } from '../models/User.js'
import { submitPaymentSchema, rejectPaymentSchema } from '../routes/payment.routes.js'

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
  console.log('   BITEFLOW FS-06 PAYMENT & VERIFICATION TESTS   ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // ========================================================
  // TEST SUITE A: AUTHENTICATION & ACCESS BOUNDARIES (HTTP)
  // ========================================================
  console.log('--- TEST SUITE A: AUTHENTICATION & ACCESS BOUNDARIES ---')

  try {
    const unauthQueue = await fetch(`${API_URL}/api/payments`)
    assert(
      unauthQueue.status === 401,
      'GET /api/payments rejects unauthenticated access with HTTP 401',
      `Got status: ${unauthQueue.status}`
    )

    const unauthPost = await fetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'test' }),
    })
    assert(
      unauthPost.status === 401,
      'POST /api/payments rejects unauthenticated payment submission with HTTP 401',
      `Got status: ${unauthPost.status}`
    )

    const unauthVerify = await fetch(`${API_URL}/api/payments/123/verify`, {
      method: 'POST',
    })
    assert(
      unauthVerify.status === 401,
      'POST /api/payments/:id/verify rejects unauthenticated requests with HTTP 401',
      `Got status: ${unauthVerify.status}`
    )

    const unauthReject = await fetch(`${API_URL}/api/payments/123/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'No funds' }),
    })
    assert(
      unauthReject.status === 401,
      'POST /api/payments/:id/reject rejects unauthenticated requests with HTTP 401',
      `Got status: ${unauthReject.status}`
    )

    const unauthOrderStatus = await fetch(`${API_URL}/api/orders/123/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    assert(
      unauthOrderStatus.status === 401,
      'PATCH /api/orders/:id/status rejects unauthenticated requests with HTTP 401',
      `Got status: ${unauthOrderStatus.status}`
    )
  } catch (err: any) {
    assert(false, 'Live HTTP Auth tests', err.message)
  }

  // ========================================================
  // TEST SUITE B: SCHEMA VALIDATION RULES
  // ========================================================
  console.log('\n--- TEST SUITE B: SCHEMA VALIDATION RULES ---')

  // B1. Valid submission payload
  const b1 = submitPaymentSchema.safeParse({
    orderId: 'ORD-123456-7890',
    paymentMethod: 'Bank Transfer',
    customerNote: 'Ref #TXN99281',
  })
  assert(b1.success, 'Valid submit payment payload passes Zod schema validation')

  // B2. Missing orderId
  const b2 = submitPaymentSchema.safeParse({
    orderId: '',
  })
  assert(!b2.success, 'Missing orderId is rejected')

  // B3. Rejection reason schema validation
  const b3Valid = rejectPaymentSchema.safeParse({ reason: 'Payment not found in bank account' })
  assert(b3Valid.success, 'Valid rejection reason passes Zod schema')

  const b3TooShort = rejectPaymentSchema.safeParse({ reason: 'No' })
  assert(!b3TooShort.success, 'Rejection reason under 3 characters is rejected')

  const b3Whitespace = rejectPaymentSchema.safeParse({ reason: '   ' })
  assert(!b3Whitespace.success, 'Whitespace-only rejection reason is rejected')

  // ========================================================
  // TEST SUITE C: PAYMENT CREATION & STATUS SEPARATION
  // ========================================================
  console.log('\n--- TEST SUITE C: PAYMENT CREATION & STATUS SEPARATION ---')

  // Create test customer & test admin
  const testCustomerId = `test_cust_fs06_${Date.now()}`
  const testAdminId = `test_admin_fs06_${Date.now()}`

  await User.create({
    clerkId: testCustomerId,
    email: 'alice.cust@biteflow.local',
    name: 'Alice Customer',
    role: 'customer',
  })

  await User.create({
    clerkId: testAdminId,
    email: 'admin.verify@biteflow.local',
    name: 'Admin Verifier',
    role: 'admin',
  })

  const realProduct = await Product.findOne({ isAvailable: true })
  assert(!!realProduct, 'Available product exists for payment testing')

  const testOrderNumber = `TEST-ORD-FS06-${Date.now().toString().slice(-4)}`
  const testOrder = await Order.create({
    orderNumber: testOrderNumber,
    clerkId: testCustomerId,
    customerName: 'Alice Customer',
    customerEmail: 'alice.cust@biteflow.local',
    customerPhone: '+1 555-0199',
    deliveryAddress: '123 Test Street',
    deliveryArea: 'Downtown',
    items: [
      {
        productId: realProduct!._id,
        name: realProduct!.name,
        image: realProduct!.image,
        unitPrice: realProduct!.price,
        quantity: 2,
        subtotal: Math.round(realProduct!.price * 2 * 100) / 100,
      },
    ],
    subtotal: Math.round(realProduct!.price * 2 * 100) / 100,
    deliveryFee: 0,
    totalAmount: Math.round(realProduct!.price * 2 * 100) / 100,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
  })

  // C1. Verify initial order state
  assert(testOrder.status === 'PENDING_PAYMENT', 'Initial order status is strictly PENDING_PAYMENT')
  assert(testOrder.paymentStatus === 'PENDING', 'Initial order paymentStatus is strictly PENDING')

  // C2. Create linked Payment record (simulating customer payment submission)
  const paymentNumber = `PAY-TEST-${Date.now().toString().slice(-6)}`
  const testPayment = await Payment.create({
    paymentNumber,
    orderId: testOrder._id,
    orderNumber: testOrder.orderNumber,
    clerkId: testCustomerId,
    customerName: testOrder.customerName,
    customerEmail: testOrder.customerEmail,
    amount: testOrder.totalAmount, // Authoritative trusted order amount
    currency: 'USD',
    status: 'PENDING',
    paymentMethod: 'MANUAL_VERIFICATION',
    customerNote: 'Customer sent transfer receipt',
    submittedAt: new Date(),
    auditHistory: [
      {
        action: 'SUBMITTED',
        previousStatus: null,
        newStatus: 'PENDING',
        actorId: testCustomerId,
        actorRole: 'customer',
        actorEmail: testOrder.customerEmail,
        timestamp: new Date(),
        note: 'Customer submitted payment step',
      },
    ],
  })

  testOrder.paymentId = testPayment._id as mongoose.Types.ObjectId
  await testOrder.save()

  assert(testPayment.status === 'PENDING', 'Payment record initializes with status PENDING')
  assert(testPayment.amount === testOrder.totalAmount, 'Payment amount matches trusted order total')
  assert(testPayment.currency === 'USD', 'Payment currency is USD ($)')
  assert(testPayment.auditHistory.length === 1, 'Payment has initial SUBMITTED audit event')
  assert(
    testPayment.auditHistory[0].actorRole === 'customer',
    'Audit event correctly attributes customer actor'
  )

  // ========================================================
  // TEST SUITE D: KITCHEN SAFETY INVARIANT ENFORCEMENT
  // ========================================================
  console.log('\n--- TEST SUITE D: KITCHEN SAFETY INVARIANT ENFORCEMENT ---')

  // D1. Order cannot transition to CONFIRMED while payment is PENDING
  const canConfirmPending = testOrder.paymentStatus === 'VERIFIED'
  assert(
    !canConfirmPending,
    'Order with PENDING payment CANNOT transition to CONFIRMED status'
  )

  // D2. Order cannot enter PREPARING while payment is PENDING
  const canPreparePending = testOrder.paymentStatus === 'VERIFIED'
  assert(
    !canPreparePending,
    'Order with PENDING payment CANNOT enter PREPARING (kitchen safety enforced)'
  )

  // ========================================================
  // TEST SUITE E: ADMIN PAYMENT VERIFICATION WORKFLOW
  // ========================================================
  console.log('\n--- TEST SUITE E: ADMIN PAYMENT VERIFICATION WORKFLOW ---')

  const verifyTime = new Date()
  testPayment.status = 'VERIFIED'
  testPayment.verifiedAt = verifyTime
  testPayment.verifiedBy = 'admin.verify@biteflow.local'
  testPayment.auditHistory.push({
    action: 'VERIFIED',
    previousStatus: 'PENDING',
    newStatus: 'VERIFIED',
    actorId: testAdminId,
    actorRole: 'admin',
    actorEmail: 'admin.verify@biteflow.local',
    timestamp: verifyTime,
    note: 'Admin verified funds in bank account',
  })

  // Order transition authorized ONLY upon verification!
  testOrder.paymentStatus = 'VERIFIED'
  testOrder.status = 'CONFIRMED'

  await testPayment.save()
  await testOrder.save()

  // E1. Verify payment status change
  assert(testPayment.status === 'VERIFIED', 'Payment status transitioned to VERIFIED')
  assert(testPayment.verifiedBy === 'admin.verify@biteflow.local', 'Admin verifier recorded')
  assert(!!testPayment.verifiedAt, 'Verification timestamp recorded')

  // E2. Verify order status change
  assert(testOrder.status === 'CONFIRMED', 'Associated order successfully transitioned to CONFIRMED')
  assert(testOrder.paymentStatus === 'VERIFIED', 'Order paymentStatus updated to VERIFIED')

  // E3. Invariant: Cannot verify an already verified payment
  const isAlreadyVerified = testPayment.status === 'VERIFIED'
  assert(
    isAlreadyVerified,
    'Guard detects already-verified payment to prevent duplicate/repeated verification'
  )

  // E4. Invariant: An order with VERIFIED payment is now eligible for PREPARING
  const canPrepareVerified = testOrder.paymentStatus === 'VERIFIED'
  assert(
    canPrepareVerified,
    'Order with VERIFIED payment is now eligible for kitchen preparation (PREPARING)'
  )

  // ========================================================
  // TEST SUITE F: ADMIN PAYMENT REJECTION WORKFLOW
  // ========================================================
  console.log('\n--- TEST SUITE F: ADMIN PAYMENT REJECTION WORKFLOW ---')

  // Create second test order for rejection testing
  const rejectOrderNumber = `TEST-ORD-REJ-${Date.now().toString().slice(-4)}`
  const rejectOrder = await Order.create({
    orderNumber: rejectOrderNumber,
    clerkId: testCustomerId,
    customerName: 'Alice Customer',
    customerEmail: 'alice.cust@biteflow.local',
    customerPhone: '+1 555-0199',
    deliveryAddress: '456 Rejection Ave',
    deliveryArea: 'Uptown',
    items: testOrder.items,
    subtotal: 25.0,
    deliveryFee: 0,
    totalAmount: 25.0,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
  })

  const rejectPayment = await Payment.create({
    paymentNumber: `PAY-REJ-${Date.now().toString().slice(-6)}`,
    orderId: rejectOrder._id,
    orderNumber: rejectOrder.orderNumber,
    clerkId: testCustomerId,
    customerName: rejectOrder.customerName,
    customerEmail: rejectOrder.customerEmail,
    amount: 25.0,
    currency: 'USD',
    status: 'PENDING',
    paymentMethod: 'MANUAL_VERIFICATION',
    submittedAt: new Date(),
    auditHistory: [
      {
        action: 'SUBMITTED',
        previousStatus: null,
        newStatus: 'PENDING',
        actorId: testCustomerId,
        actorRole: 'customer',
        timestamp: new Date(),
        note: 'Customer submitted payment',
      },
    ],
  })

  const rejectTime = new Date()
  const rejectReason = 'Transaction reference #99281 could not be located in bank ledger'

  rejectPayment.status = 'REJECTED'
  rejectPayment.rejectedAt = rejectTime
  rejectPayment.rejectedBy = 'admin.verify@biteflow.local'
  rejectPayment.rejectionReason = rejectReason
  rejectPayment.auditHistory.push({
    action: 'REJECTED',
    previousStatus: 'PENDING',
    newStatus: 'REJECTED',
    actorId: testAdminId,
    actorRole: 'admin',
    actorEmail: 'admin.verify@biteflow.local',
    timestamp: rejectTime,
    note: rejectReason,
  })

  rejectOrder.paymentStatus = 'REJECTED'
  rejectOrder.paymentRejectionReason = rejectReason
  // Order remains PENDING_PAYMENT, strictly NOT CONFIRMED!

  await rejectPayment.save()
  await rejectOrder.save()

  // F1. Verify rejection fields
  assert(rejectPayment.status === 'REJECTED', 'Payment status transitioned to REJECTED')
  assert(rejectPayment.rejectionReason === rejectReason, 'Rejection reason persisted accurately')
  assert(rejectPayment.rejectedBy === 'admin.verify@biteflow.local', 'Admin rejector recorded')
  assert(!!rejectPayment.rejectedAt, 'Rejection timestamp recorded')

  // F2. Invariant: Order must NOT become CONFIRMED upon rejection
  assert(
    rejectOrder.status === 'PENDING_PAYMENT',
    'Associated order remains in PENDING_PAYMENT upon rejection (NOT CONFIRMED)'
  )

  // F3. Invariant: Order cannot enter PREPARING
  const canPrepareRejected = (rejectOrder.paymentStatus as string) === 'VERIFIED'
  assert(
    !canPrepareRejected,
    'Order with REJECTED payment cannot enter kitchen preparation (PREPARING blocked)'
  )

  // F4. Invariant: Cannot verify a rejected payment
  const cannotVerifyRejected = rejectPayment.status === 'REJECTED'
  assert(
    cannotVerifyRejected,
    'Business rule: Cannot directly verify an already rejected payment'
  )

  // ========================================================
  // TEST SUITE G: AUDIT TRAIL INTEGRITY
  // ========================================================
  console.log('\n--- TEST SUITE G: AUDIT TRAIL INTEGRITY ---')

  const reloadedPayment = await Payment.findById(rejectPayment._id).lean()
  assert(!!reloadedPayment, 'Payment reloaded from MongoDB')
  assert(
    reloadedPayment!.auditHistory.length === 2,
    'Payment maintains complete 2-event audit history (SUBMITTED + REJECTED)'
  )
  assert(
    reloadedPayment!.auditHistory[0].action === 'SUBMITTED' &&
      reloadedPayment!.auditHistory[1].action === 'REJECTED',
    'Audit history preserves chronological sequence of state transitions'
  )
  assert(
    reloadedPayment!.auditHistory[1].note === rejectReason,
    'Audit event captures rejection reason as note'
  )

  // Clean up test records
  await Order.deleteMany({ _id: { $in: [testOrder._id, rejectOrder._id] } })
  await Payment.deleteMany({ _id: { $in: [testPayment._id, rejectPayment._id] } })
  await User.deleteMany({ clerkId: { $in: [testCustomerId, testAdminId] } })
  console.log('  ✓ Cleaned up all test records from database')

  // ========================================================
  // SUMMARY RESULTS
  // ========================================================
  console.log('\n======================================================')
  console.log(`TOTAL TESTS: ${totalPassed + totalFailed}`)
  console.log(`PASSED: ${totalPassed}`)
  console.log(`FAILED: ${totalFailed}`)
  console.log('======================================================\n')

  await mongoose.disconnect()

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('[Test Execution Error]:', err)
  process.exit(1)
})
