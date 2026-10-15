import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Generate human-readable unique payment number matching BiteFlow convention (PAY-XXXXXX-XXXX)
 */
function generatePaymentNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(1000 + Math.random() * 9000)
  return `PAY-${timestamp}-${random}`
}

export interface BackfillCandidate {
  orderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  amount: number
  currency: string
  orderStatus: string
  orderPaymentStatus: string
  createdAt: Date
  proposedPaymentNumber: string
  reason: string
}

export async function runBackfill(options: { execute?: boolean } = {}) {
  const isExecute = options.execute === true
  const isDryRun = !isExecute

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri)
  }

  console.log('======================================================================')
  console.log('       BITEFLOW LEGACY ORDERS PAYMENT BACKFILL MIGRATION              ')
  console.log('======================================================================')
  console.log(`Database URI: ${uri}`)
  console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (READ-ONLY, NO MODIFICATIONS)' : 'EXECUTE (COMMITTING TO DATABASE)'}`)
  console.log('----------------------------------------------------------------------\n')

  // Explicitly scoped to the three approved legacy orders
  const TARGET_ORDER_NUMBERS = ['ORD-084035-8831', 'ORD-740093-2125', 'ORD-959272-7692']

  // Target orders: PENDING_PAYMENT orders where paymentId is missing or null
  const candidateOrders = await Order.find({
    orderNumber: { $in: TARGET_ORDER_NUMBERS },
    status: 'PENDING_PAYMENT',
    $or: [{ paymentId: { $exists: false } }, { paymentId: null }],
  })
    .sort({ createdAt: 1 })
    .lean()

  console.log(`Found ${candidateOrders.length} candidate order(s) matching target orders with status PENDING_PAYMENT and no linked paymentId.\n`)

  const migrationCandidates: BackfillCandidate[] = []
  const alreadyExistingPayments: Array<{ orderNumber: string; paymentNumber: string }> = []
  const skippedOrders: Array<{ orderNumber: string; reason: string }> = []

  for (const candidateOrder of candidateOrders) {
    // PRE-FLIGHT RE-CHECK BEFORE EACH CHANGE:
    // Re-fetch fresh order document from database to guarantee eligibility
    const freshOrder = await Order.findById(candidateOrder._id)
    if (!freshOrder) {
      skippedOrders.push({
        orderNumber: candidateOrder.orderNumber,
        reason: 'Order no longer exists in database',
      })
      continue
    }

    if (freshOrder.status !== 'PENDING_PAYMENT') {
      skippedOrders.push({
        orderNumber: freshOrder.orderNumber,
        reason: `Order status is ${freshOrder.status}, not PENDING_PAYMENT`,
      })
      continue
    }

    if (freshOrder.paymentStatus !== 'PENDING') {
      skippedOrders.push({
        orderNumber: freshOrder.orderNumber,
        reason: `Order payment status is ${freshOrder.paymentStatus}, not PENDING`,
      })
      continue
    }

    if (freshOrder.paymentId) {
      skippedOrders.push({
        orderNumber: freshOrder.orderNumber,
        reason: `Order already has linked paymentId: ${freshOrder.paymentId}`,
      })
      continue
    }

    // Check if a payment document already exists in the payments collection for this order
    const existingPayment = await Payment.findOne({
      $or: [{ orderId: freshOrder._id }, { orderNumber: freshOrder.orderNumber }],
    }).lean()

    if (existingPayment) {
      alreadyExistingPayments.push({
        orderNumber: freshOrder.orderNumber,
        paymentNumber: existingPayment.paymentNumber,
      })
      if (isExecute) {
        // Link existing payment to order idempotently without creating duplicate
        freshOrder.paymentId = existingPayment._id as mongoose.Types.ObjectId
        await freshOrder.save()
        console.log(`[LINKED] Reconnected existing Payment ${existingPayment.paymentNumber} to Order ${freshOrder.orderNumber}`)
      }
      continue
    }

    // Generate unique payment number ensuring no collision
    let paymentNumber = generatePaymentNumber()
    let collision = await Payment.findOne({ paymentNumber }).lean()
    while (collision) {
      paymentNumber = generatePaymentNumber()
      collision = await Payment.findOne({ paymentNumber }).lean()
    }

    const candidate: BackfillCandidate = {
      orderId: freshOrder._id.toString(),
      orderNumber: freshOrder.orderNumber,
      customerName: freshOrder.customerName,
      customerEmail: freshOrder.customerEmail || '',
      amount: freshOrder.totalAmount,
      currency: 'USD',
      orderStatus: freshOrder.status,
      orderPaymentStatus: freshOrder.paymentStatus,
      createdAt: freshOrder.createdAt,
      proposedPaymentNumber: paymentNumber,
      reason: 'Legacy FS-05 order created before Payment model existed',
    }

    migrationCandidates.push(candidate)

    if (isDryRun) {
      console.log(`[CANDIDATE IDENTIFIED] ${freshOrder.orderNumber}:`)
      console.log(`  - Order ID:             ${candidate.orderId}`)
      console.log(`  - Customer:             ${candidate.customerName} (${candidate.customerEmail || 'no email'})`)
      console.log(`  - Order Created At:     ${candidate.createdAt.toISOString()}`)
      console.log(`  - Authoritative Amount: $${candidate.amount.toFixed(2)} ${candidate.currency}`)
      console.log(`  - Order Status:         ${candidate.orderStatus}`)
      console.log(`  - Payment Status:       ${candidate.orderPaymentStatus}`)
      console.log(`  - Proposed Payment Ref: ${candidate.proposedPaymentNumber}`)
      console.log(`  - Payment Status:       PENDING`)
      console.log(`  - Payment Method:       MANUAL_VERIFICATION`)
      console.log(`  - Audit Note:           Initial payment record backfilled for legacy checkout order`)
      console.log('')
    } else {
      // EXECUTE MODE: Create Payment document with status PENDING and link to Order
      const newPayment = await Payment.create({
        paymentNumber: candidate.proposedPaymentNumber,
        orderId: freshOrder._id,
        orderNumber: freshOrder.orderNumber,
        clerkId: freshOrder.clerkId,
        customerName: freshOrder.customerName,
        customerEmail: freshOrder.customerEmail || '',
        amount: freshOrder.totalAmount,
        currency: 'USD',
        status: 'PENDING',
        paymentMethod: 'MANUAL_VERIFICATION',
        customerNote: '',
        submittedAt: freshOrder.createdAt || new Date(),
        auditHistory: [
          {
            action: 'SUBMITTED',
            previousStatus: null,
            newStatus: 'PENDING',
            actorId: freshOrder.clerkId,
            actorRole: 'customer',
            actorEmail: freshOrder.customerEmail || '',
            timestamp: new Date(),
            note: 'Initial payment record backfilled for legacy checkout order',
          },
        ],
      })

      // Link payment to order without altering order status
      freshOrder.paymentId = newPayment._id as mongoose.Types.ObjectId
      await freshOrder.save()

      console.log(`[MIGRATED] Created Payment ${newPayment.paymentNumber} ($${newPayment.amount.toFixed(2)} USD, status: PENDING) and linked to Order ${freshOrder.orderNumber}`)
    }
  }

  console.log('----------------------------------------------------------------------')
  console.log('                          SUMMARY REPORT                              ')
  console.log('----------------------------------------------------------------------')
  console.log(`Mode:                         ${isDryRun ? 'DRY-RUN (NO CHANGES MADE)' : 'EXECUTE (CHANGES COMMITTED)'}`)
  console.log(`Candidate Orders Inspected:   ${candidateOrders.length}`)
  console.log(`Eligible for Payment Creation: ${migrationCandidates.length}`)
  console.log(`Already Linked Payments:      ${alreadyExistingPayments.length}`)
  console.log(`Skipped Ineligible Orders:    ${skippedOrders.length}`)
  console.log('----------------------------------------------------------------------')

  if (isDryRun) {
    console.log('\n[DRY-RUN SAFEGUARD NOTICE]')
    console.log('No database records were created, modified, or deleted.')
    console.log('To execute this migration and commit records to MongoDB, run:')
    console.log('  npx tsx src/scripts/backfill-legacy-payments.ts --execute\n')
  } else {
    // POST-EXECUTION VERIFICATION
    console.log('\n======================================================================')
    console.log('                 POST-EXECUTION VERIFICATION AUDIT                    ')
    console.log('======================================================================')

    const totalOrders = await Order.countDocuments()
    const totalPayments = await Payment.countDocuments()
    const pendingPayments = await Payment.countDocuments({ status: 'PENDING' })
    const verifiedPayments = await Payment.countDocuments({ status: 'VERIFIED' })
    const rejectedPayments = await Payment.countDocuments({ status: 'REJECTED' })

    console.log(`Total Orders in Database:       ${totalOrders}`)
    console.log(`Total Payments in Database:     ${totalPayments}`)
    console.log(`- Pending Verification Payments: ${pendingPayments}`)
    console.log(`- Verified Payments:             ${verifiedPayments}`)
    console.log(`- Rejected Payments:             ${rejectedPayments}\n`)

    console.log('Verifying the 3 Target Legacy Orders:')
    for (const ref of TARGET_ORDER_NUMBERS) {
      const ord = await Order.findOne({ orderNumber: ref }).lean()
      if (!ord) {
        throw new Error(`[POST-CHECK FAILED] Order ${ref} was not found!`)
      }
      if (!ord.paymentId) {
        throw new Error(`[POST-CHECK FAILED] Order ${ref} does not have linked paymentId!`)
      }
      const p = await Payment.findById(ord.paymentId).lean()
      if (!p) {
        throw new Error(`[POST-CHECK FAILED] Payment ${ord.paymentId} for order ${ref} not found!`)
      }
      if (p.status !== 'PENDING') {
        throw new Error(`[POST-CHECK FAILED] Payment ${p.paymentNumber} status is ${p.status}, expected PENDING!`)
      }
      if (ord.status !== 'PENDING_PAYMENT') {
        throw new Error(`[POST-CHECK FAILED] Order ${ref} status was mutated to ${ord.status}, expected PENDING_PAYMENT!`)
      }
      console.log(`  ✓ ${ref}: Amount $${ord.totalAmount.toFixed(2)}, Order Status: ${ord.status}, Payment: ${p.paymentNumber} (${p.status})`)
    }

    console.log('\nVerifying Existing Payments Untouched:')
    const existingVerifiedRefs = ['ORD-189046-6760', 'ORD-006408-9869', 'ORD-487037-6957']
    for (const ref of existingVerifiedRefs) {
      const ord = await Order.findOne({ orderNumber: ref }).lean()
      const p = ord ? await Payment.findById(ord.paymentId).lean() : null
      if (!ord || !p || p.status !== 'VERIFIED') {
        throw new Error(`[POST-CHECK FAILED] Existing verified order ${ref} was unexpectedly modified!`)
      }
      console.log(`  ✓ ${ref}: Untouched ($${ord.totalAmount.toFixed(2)}, Order: ${ord.status}, Payment: ${p.paymentNumber} VERIFIED)`)
    }

    // Verify existing pending order ORD-133128-6520
    const prevPendingOrd = await Order.findOne({ orderNumber: 'ORD-133128-6520' }).lean()
    const prevPendingP = prevPendingOrd ? await Payment.findById(prevPendingOrd.paymentId).lean() : null
    if (!prevPendingOrd || !prevPendingP || prevPendingP.status !== 'PENDING') {
      throw new Error(`[POST-CHECK FAILED] Existing pending order ORD-133128-6520 was unexpectedly modified!`)
    }
    console.log(`  ✓ ORD-133128-6520: Untouched ($${prevPendingOrd.totalAmount.toFixed(2)}, Order: ${prevPendingOrd.status}, Payment: ${prevPendingP.paymentNumber} PENDING)`)

    console.log('\n✓ ALL POST-EXECUTION INTEGRITY CHECKS PASSED!')
  }

  return {
    isDryRun,
    candidates: migrationCandidates,
    alreadyExistingPayments,
    skippedOrders,
  }
}

// Direct execution from command line
if (process.argv[1] && process.argv[1].endsWith('backfill-legacy-payments.ts')) {
  const isExecute = process.argv.includes('--execute') && !process.argv.includes('--dry-run')
  runBackfill({ execute: isExecute })
    .then(async () => {
      await mongoose.disconnect()
      process.exit(0)
    })
    .catch(async (err) => {
      console.error('[Migration Error]:', err)
      await mongoose.disconnect()
      process.exit(1)
    })
}
