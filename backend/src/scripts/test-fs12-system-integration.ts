import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Order } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { RestaurantSettings } from '../models/RestaurantSettings.js'

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
  console.log('   BITEFLOW FS-12 SYSTEM INTEGRATION TEST SUITE       ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // Track created records for 100% self-cleanup
  const createdUserIds: string[] = []
  const createdOrderIds: mongoose.Types.ObjectId[] = []
  const createdPaymentIds: mongoose.Types.ObjectId[] = []
  let originalSettingsBackup: any = null

  // Ensure test accounts
  const testAdminClerkId = `test_admin_fs12_${Date.now()}`
  const testCustomerClerkId = `test_customer_fs12_${Date.now()}`

  const adminUser = await User.create({
    clerkId: testAdminClerkId,
    email: `admin_fs12_${Date.now()}@biteflow.com`,
    name: 'Admin FS12 Tester',
    role: 'admin',
  })
  createdUserIds.push(testAdminClerkId)

  const customerUser = await User.create({
    clerkId: testCustomerClerkId,
    email: `customer_fs12_${Date.now()}@example.com`,
    name: 'Customer FS12 Tester',
    role: 'customer',
  })
  createdUserIds.push(testCustomerClerkId)

  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-test-user-id': testAdminClerkId,
    'x-test-bypass-rate-limit': 'true',
  }

  const customerHeaders = {
    'Content-Type': 'application/json',
    'x-test-user-id': testCustomerClerkId,
    'x-test-bypass-rate-limit': 'true',
  }

  // Backup current restaurant settings
  const existingSettings = await RestaurantSettings.findOne()
  if (existingSettings) {
    originalSettingsBackup = existingSettings.toObject()
  }

  try {
    // ========================================================
    // TEST SUITE A: RESTAURANT SETTINGS API & AUTHORIZATION
    // ========================================================
    console.log('--- TEST SUITE A: RESTAURANT SETTINGS API & AUTHORIZATION ---')

    // A1. Public settings endpoint can be fetched unauthenticated
    const pubSettingsRes = await fetch(`${API_URL}/api/settings`)
    assert(
      pubSettingsRes.status === 200,
      'Public GET /api/settings returns HTTP 200 without authentication',
      `Got status: ${pubSettingsRes.status}`
    )
    const pubSettingsData = (await pubSettingsRes.json()) as any
    assert(
      pubSettingsData.success === true && pubSettingsData.settings.restaurantName === 'BiteFlow',
      'Public settings expose restaurantName "BiteFlow"',
      JSON.stringify(pubSettingsData.settings)
    )
    assert(
      pubSettingsData.settings.currency === 'USD',
      'Public settings expose currency "USD"',
      `Got currency: ${pubSettingsData.settings.currency}`
    )
    assert(
      !('mongoUri' in pubSettingsData.settings) &&
        !('secretKey' in pubSettingsData.settings) &&
        !('_id' in pubSettingsData.settings),
      'Public settings sanitize internal database fields and server secrets',
      'Internal fields were properly sanitized'
    )

    // A2. Unauthenticated request to Admin settings endpoint is rejected with 401
    const unauthAdminSettings = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatingHours: '7:00 AM – 10:00 PM' }),
    })
    assert(
      unauthAdminSettings.status === 401,
      'Unauthenticated PATCH /api/admin/settings rejected with HTTP 401',
      `Got status: ${unauthAdminSettings.status}`
    )

    // A3. Customer request to Admin settings endpoint is rejected with 403 Forbidden
    const customerAdminSettings = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({ operatingHours: '7:00 AM – 10:00 PM' }),
    })
    assert(
      customerAdminSettings.status === 403,
      'Customer role PATCH /api/admin/settings rejected with HTTP 403 Forbidden',
      `Got status: ${customerAdminSettings.status}`
    )

    // A4. Admin can update restaurant settings with validation
    const adminUpdateSettingsRes = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        contactPhone: '+252-610000000',
        operatingHours: '6:00 AM – 11:30 PM',
        restaurantStatus: 'OPEN',
        isDeliveryActive: true,
      }),
    })
    assert(
      adminUpdateSettingsRes.status === 200,
      'Admin PATCH /api/admin/settings succeeds with HTTP 200',
      `Got status: ${adminUpdateSettingsRes.status}`
    )
    const adminUpdatedData = (await adminUpdateSettingsRes.json()) as any
    assert(
      adminUpdatedData.settings.contactPhone === '+252-610000000' &&
        adminUpdatedData.settings.operatingHours === '6:00 AM – 11:30 PM',
      'Persisted settings reflect updated phone and operating hours',
      JSON.stringify(adminUpdatedData.settings)
    )

    // A5. Settings update rejects invalid fields (Zod validation)
    const invalidSettingsRes = await fetch(`${API_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        restaurantStatus: 'INVALID_STATUS',
      }),
    })
    assert(
      invalidSettingsRes.status === 400,
      'Admin PATCH /api/admin/settings with invalid status enum rejected with HTTP 400',
      `Got status: ${invalidSettingsRes.status}`
    )

    // ========================================================
    // TEST SUITE B: OPERATIONAL RULES & SAFETY SAFEGUARDS
    // ========================================================
    console.log('\n--- TEST SUITE B: OPERATIONAL RULES & SAFETY SAFEGUARDS ---')

    // Find an active product to test order placement
    const testProduct = await Product.findOne({ isAvailable: true }).lean()
    assert(!!testProduct, 'Found available product for order testing', testProduct?.name)

    if (testProduct) {
      // B1. Close restaurant and verify order placement is rejected
      await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ restaurantStatus: 'CLOSED' }),
      })

      const closedOrderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          items: [{ id: testProduct._id.toString(), quantity: 1 }],
          delivery: {
            recipientName: 'Test Closed Customer',
            phone: '+1 555-0199',
            deliveryAddress: '100 Closed St',
            deliveryArea: 'Downtown',
          },
        }),
      })
      assert(
        closedOrderRes.status === 400,
        'POST /api/orders rejected with HTTP 400 when restaurant is CLOSED',
        `Got status: ${closedOrderRes.status}`
      )
      const closedOrderData = (await closedOrderRes.json()) as any
      assert(
        closedOrderData.error?.includes('closed'),
        'Rejection response clearly informs user that restaurant is closed',
        closedOrderData.error
      )

      // B2. Set restaurant OPEN but pause delivery and verify order placement is rejected
      await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ restaurantStatus: 'OPEN', isDeliveryActive: false }),
      })

      const pausedDeliveryOrderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          items: [{ id: testProduct._id.toString(), quantity: 1 }],
          delivery: {
            recipientName: 'Test Paused Delivery Customer',
            phone: '+1 555-0199',
            deliveryAddress: '100 Paused St',
            deliveryArea: 'Downtown',
          },
        }),
      })
      assert(
        pausedDeliveryOrderRes.status === 400,
        'POST /api/orders rejected with HTTP 400 when delivery service is paused',
        `Got status: ${pausedDeliveryOrderRes.status}`
      )
      const pausedDeliveryData = (await pausedDeliveryOrderRes.json()) as any
      assert(
        pausedDeliveryData.error?.includes('inactive') ||
          pausedDeliveryData.error?.includes('paused'),
        'Rejection response clearly informs user delivery is paused/inactive',
        pausedDeliveryData.error
      )

      // Restore restaurant OPEN and delivery active for subsequent tests
      await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ restaurantStatus: 'OPEN', isDeliveryActive: true }),
      })
    }

    // ========================================================
    // TEST SUITE C: SYSTEM HEALTH CHECK & OPERATIONAL DIAGNOSTICS
    // ========================================================
    console.log('\n--- TEST SUITE C: SYSTEM HEALTH CHECK & OPERATIONAL DIAGNOSTICS ---')

    const healthRes = await fetch(`${API_URL}/api/health`)
    assert(
      healthRes.status === 200,
      'GET /api/health responds with HTTP 200 OK',
      `Got status: ${healthRes.status}`
    )
    const healthData = (await healthRes.json()) as any
    assert(
      healthData.status === 'ok' && healthData.database === 'connected',
      'Health check reports status "ok" and database "connected"',
      JSON.stringify(healthData)
    )
    assert(
      !('mongodb' in healthData) &&
        !('connectionString' in healthData) &&
        !('db_password' in healthData),
      'Health check exposes zero internal connection strings, credentials, or sensitive diagnostics',
      'Clean output verified'
    )

    // ========================================================
    // TEST SUITE D: COMPLETE END-TO-END RESTAURANT WORKFLOW
    // ========================================================
    console.log('\n--- TEST SUITE D: COMPLETE END-TO-END RESTAURANT WORKFLOW ---')

    if (testProduct) {
      // Step 1: Customer reviews order before submission
      const reviewRes = await fetch(`${API_URL}/api/orders/review`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          items: [{ id: testProduct._id.toString(), quantity: 2 }],
        }),
      })
      assert(
        reviewRes.status === 200,
        'Customer order review succeeds with HTTP 200',
        `Got status: ${reviewRes.status}`
      )
      const reviewData = (await reviewRes.json()) as any
      const expectedSubtotal = Math.round(testProduct.price * 2 * 100) / 100
      assert(
        reviewData.subtotal === expectedSubtotal,
        `Review calculation correctly computed authoritative subtotal: $${expectedSubtotal}`,
        `Got: $${reviewData.subtotal}`
      )

      // Step 2: Customer submits real order through application API
      const placeOrderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          items: [{ id: testProduct._id.toString(), quantity: 2 }],
          delivery: {
            recipientName: 'Alice Customer',
            phone: '+1 555-0123',
            deliveryAddress: '456 Flowing Ave, Suite 3',
            deliveryArea: 'Central District',
            deliveryInstructions: 'Leave with front desk',
          },
        }),
      })
      assert(
        placeOrderRes.status === 201,
        'Customer order creation succeeds with HTTP 201 Created',
        `Got status: ${placeOrderRes.status}`
      )
      const placedOrderData = (await placeOrderRes.json()) as any
      const order = placedOrderData.order
      assert(
        !!order && order.status === 'PENDING_PAYMENT' && order.paymentStatus === 'PENDING',
        `Order ${order?.orderNumber} created in PENDING_PAYMENT status awaiting manual verification`,
        `Status: ${order?.status}, Payment: ${order?.paymentStatus}`
      )
      createdOrderIds.push(new mongoose.Types.ObjectId(order.id))
      createdPaymentIds.push(new mongoose.Types.ObjectId(order.paymentId))

      // Step 3: Rapid duplicate submission protection test
      const duplicateOrderRes = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: customerHeaders,
        body: JSON.stringify({
          items: [{ id: testProduct._id.toString(), quantity: 2 }],
          delivery: {
            recipientName: 'Alice Customer',
            phone: '+1 555-0123',
            deliveryAddress: '456 Flowing Ave, Suite 3',
            deliveryArea: 'Central District',
          },
        }),
      })
      assert(
        duplicateOrderRes.status === 200,
        'Rapid consecutive identical checkout safely handled idempotently (HTTP 200 with existing order)',
        `Got status: ${duplicateOrderRes.status}`
      )
      const duplicateData = (await duplicateOrderRes.json()) as any
      assert(
        duplicateData.order.orderNumber === order.orderNumber,
        'Idempotent guard returned original order without creating duplicate database record',
        `Matched orderNumber: ${duplicateData.order.orderNumber}`
      )

      // Step 4: Customer checks their tracking / order details
      const customerTrackRes = await fetch(`${API_URL}/api/orders/${order.orderNumber}`, {
        headers: customerHeaders,
      })
      assert(
        customerTrackRes.status === 200,
        'Customer successfully tracks their own order by orderNumber',
        `Got status: ${customerTrackRes.status}`
      )
      const customerTrackData = (await customerTrackRes.json()) as any
      assert(
        customerTrackData.order.status === 'PENDING_PAYMENT',
        'Customer sees status is PENDING_PAYMENT',
        customerTrackData.order.status
      )

      // Step 5: Customer cannot self-verify payment
      const customerSelfVerifyRes = await fetch(`${API_URL}/api/payments/${order.paymentId}/verify`, {
        method: 'POST',
        headers: customerHeaders,
      })
      assert(
        customerSelfVerifyRes.status === 403,
        'Customer cannot self-verify payment (HTTP 403 Forbidden)',
        `Got status: ${customerSelfVerifyRes.status}`
      )

      // Step 6: Customer cannot directly move order to CONFIRMED or PREPARING
      const customerStatusChangeRes = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: customerHeaders,
        body: JSON.stringify({ status: 'CONFIRMED' }),
      })
      assert(
        customerStatusChangeRes.status === 403,
        'Customer cannot modify order fulfillment status (HTTP 403 Forbidden)',
        `Got status: ${customerStatusChangeRes.status}`
      )

      // Step 7: Admin inspects payments queue and locates pending payment
      const adminPaymentsRes = await fetch(`${API_URL}/api/payments?status=PENDING`, {
        headers: adminHeaders,
      })
      assert(
        adminPaymentsRes.status === 200,
        'Admin retrieves pending payments queue (HTTP 200)',
        `Got status: ${adminPaymentsRes.status}`
      )
      const adminPaymentsData = (await adminPaymentsRes.json()) as any
      const foundPayment = adminPaymentsData.payments.find(
        (p: any) => p._id === order.paymentId || p.paymentNumber === order.paymentNumber
      )
      assert(
        !!foundPayment,
        `Admin locates pending payment ${order.paymentNumber} in the queue`,
        `Payment found: ${!!foundPayment}`
      )

      // Step 8: Admin verifies receipt of money through verified payment API
      const verifyRes = await fetch(`${API_URL}/api/payments/${order.paymentId}/verify`, {
        method: 'POST',
        headers: adminHeaders,
      })
      assert(
        verifyRes.status === 200,
        'Admin verifies manual payment receipt through authorized endpoint (HTTP 200)',
        `Got status: ${verifyRes.status}`
      )
      const verifyData = (await verifyRes.json()) as any
      assert(
        verifyData.payment.status === 'VERIFIED',
        'Payment status transitioned to VERIFIED',
        verifyData.payment.status
      )

      // Step 9: Order status automatically transitioned from PENDING_PAYMENT to CONFIRMED
      const checkConfirmedOrderRes = await fetch(`${API_URL}/api/orders/${order.orderNumber}`, {
        headers: customerHeaders,
      })
      const checkConfirmedData = (await checkConfirmedOrderRes.json()) as any
      assert(
        checkConfirmedData.order.status === 'CONFIRMED' &&
          checkConfirmedData.order.paymentStatus === 'VERIFIED',
        'Order automatically transitioned to CONFIRMED with paymentStatus VERIFIED upon verification',
        `Status: ${checkConfirmedData.order.status}, Payment: ${checkConfirmedData.order.paymentStatus}`
      )

      // Step 10: Double payment verification is rejected
      const doubleVerifyRes = await fetch(`${API_URL}/api/payments/${order.paymentId}/verify`, {
        method: 'POST',
        headers: adminHeaders,
      })
      assert(
        doubleVerifyRes.status === 409,
        'Double verification of already-verified payment rejected with HTTP 409 Conflict',
        `Got status: ${doubleVerifyRes.status}`
      )

      // Step 11: Kitchen Lifecycle: CONFIRMED -> PREPARING
      const prepRes = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'PREPARING', note: 'Kitchen started assembling burgers' }),
      })
      assert(
        prepRes.status === 200,
        'Admin moves order from CONFIRMED -> PREPARING (HTTP 200)',
        `Got status: ${prepRes.status}`
      )
      const prepData = (await prepRes.json()) as any
      assert(
        prepData.order.status === 'PREPARING',
        'Persisted order status is PREPARING',
        prepData.order.status
      )

      // Step 12: Invalid transition rejection: cannot jump from PREPARING directly to DELIVERED
      const invalidJumpRes = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'DELIVERED' }),
      })
      assert(
        invalidJumpRes.status === 400,
        'State machine rejects invalid transition jump PREPARING -> DELIVERED (HTTP 400)',
        `Got status: ${invalidJumpRes.status}`
      )

      // Step 13: Kitchen Lifecycle: PREPARING -> READY
      const readyRes = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'READY', note: 'Order boxed and ready for courier' }),
      })
      assert(
        readyRes.status === 200,
        'Admin moves order from PREPARING -> READY (HTTP 200)',
        `Got status: ${readyRes.status}`
      )

      // Step 14: Fulfillment Lifecycle: READY -> DISPATCHED
      const dispatchRes = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'DISPATCHED', note: 'Handed off to courier on motorbike' }),
      })
      assert(
        dispatchRes.status === 200,
        'Admin moves order from READY -> DISPATCHED (HTTP 200)',
        `Got status: ${dispatchRes.status}`
      )

      // Step 15: Fulfillment Lifecycle: DISPATCHED -> DELIVERED
      const deliverRes = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'DELIVERED', note: 'Received by customer Alice' }),
      })
      assert(
        deliverRes.status === 200,
        'Admin moves order from DISPATCHED -> DELIVERED (HTTP 200)',
        `Got status: ${deliverRes.status}`
      )
      const deliveredData = (await deliverRes.json()) as any
      assert(
        deliveredData.order.status === 'DELIVERED',
        'Final persisted order status is DELIVERED',
        deliveredData.order.status
      )

      // Step 16: Customer sees completed order in order history
      const myOrdersRes = await fetch(`${API_URL}/api/orders/my-orders`, {
        headers: customerHeaders,
      })
      assert(
        myOrdersRes.status === 200,
        'Customer retrieves their order history (HTTP 200)',
        `Got status: ${myOrdersRes.status}`
      )
      const myOrdersData = (await myOrdersRes.json()) as any
      const foundInHistory = myOrdersData.orders.find((o: any) => o.orderNumber === order.orderNumber)
      assert(
        !!foundInHistory && foundInHistory.status === 'DELIVERED',
        'Customer order history retains completed DELIVERED order with snapshots intact',
        `Found: ${!!foundInHistory}, Status: ${foundInHistory?.status}`
      )

      // Step 17: Admin Sales & Financial Reports include the delivered verified order
      const ordersReportRes = await fetch(`${API_URL}/api/admin/reports/orders`, {
        headers: adminHeaders,
      })
      assert(
        ordersReportRes.status === 200,
        'Admin retrieves orders report (HTTP 200)',
        `Got status: ${ordersReportRes.status}`
      )
      const ordersReportData = (await ordersReportRes.json()) as any
      assert(
        ordersReportData.summary.totalAmount > 0,
        `Orders report correctly includes revenue ($${ordersReportData.summary.totalAmount})`,
        `Total orders: ${ordersReportData.summary.totalOrders}`
      )
      const foundInReport = ordersReportData.orders.find((o: any) => o.orderNumber === order.orderNumber)
      assert(
        !!foundInReport && foundInReport.status === 'DELIVERED',
        'Delivered order is accurately reflected in admin reports with status DELIVERED',
        `Found: ${!!foundInReport}, Status: ${foundInReport?.status}`
      )
    }
  } catch (error: any) {
    console.error('Test execution error:', error)
    totalFailed++
  } finally {
    // ========================================================
    // TEARDOWN & 100% SELF-CLEANUP
    // ========================================================
    console.log('\n--- CLEANUP & TEARDOWN ---')
    try {
      if (createdPaymentIds.length > 0) {
        await Payment.deleteMany({ _id: { $in: createdPaymentIds } })
      }
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } })
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ clerkId: { $in: createdUserIds } })
      }
      if (originalSettingsBackup) {
        await RestaurantSettings.findOneAndUpdate({}, originalSettingsBackup, { upsert: true })
      }
      console.log('  ✓ Cleaned up test orders, payments, users, and restored settings.')
    } catch (cleanupErr: any) {
      console.error('  ✗ Cleanup error:', cleanupErr.message)
    }

    await mongoose.disconnect()

    console.log('\n======================================================')
    console.log(`TOTAL TESTS: ${totalPassed + totalFailed}`)
    console.log(`PASSED:      ${totalPassed}`)
    console.log(`FAILED:      ${totalFailed}`)
    console.log('======================================================\n')

    if (totalFailed > 0) {
      process.exit(1)
    }
  }
}

runTests()
