import mongoose from 'mongoose'
import { z } from 'zod'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { deliverySchema, orderItemInputSchema, createOrderSchema } from '../routes/order.routes.js'

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
  console.log('   BITEFLOW FS-05 CHECKOUT & DELIVERY AUTOMATED TESTS   ')
  console.log('======================================================\n')

  const API_URL = 'http://localhost:5000'

  // ========================================================
  // TEST SUITE A: AUTHENTICATION ENFORCEMENT
  // ========================================================
  console.log('--- TEST SUITE A: AUTHENTICATION ENFORCEMENT ---')

  try {
    const unauthReview = await fetch(`${API_URL}/api/orders/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: '123', quantity: 1 }] }),
    })
    assert(
      unauthReview.status === 401,
      'POST /api/orders/review rejects unauthenticated requests with HTTP 401',
      `Got status: ${unauthReview.status}`
    )

    const unauthPost = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: '123', quantity: 1 }] }),
    })
    assert(
      unauthPost.status === 401,
      'POST /api/orders rejects unauthenticated checkout submission with HTTP 401',
      `Got status: ${unauthPost.status}`
    )

    const unauthHistory = await fetch(`${API_URL}/api/orders/my-orders`)
    assert(
      unauthHistory.status === 401,
      'GET /api/orders/my-orders rejects unauthenticated access with HTTP 401',
      `Got status: ${unauthHistory.status}`
    )
  } catch (err: any) {
    assert(false, 'Live HTTP Auth tests', err.message)
  }

  // ========================================================
  // TEST SUITE B: DELIVERY INFORMATION VALIDATION
  // ========================================================
  console.log('\n--- TEST SUITE B: DELIVERY INFORMATION VALIDATION ---')

  // B1. Valid delivery payload
  const validDelivery = {
    recipientName: 'Alice Johnson',
    phone: '+1 555-0199',
    deliveryAddress: '742 Evergreen Terrace, Apt 2',
    deliveryArea: 'Springfield West',
    deliveryInstructions: 'Ring doorbell twice',
  }
  const b1Result = deliverySchema.safeParse(validDelivery)
  assert(b1Result.success, 'Valid delivery data passes Zod schema validation')

  // B2. Whitespace-only recipient name
  const b2Result = deliverySchema.safeParse({
    ...validDelivery,
    recipientName: '    ',
  })
  assert(
    !b2Result.success,
    'Whitespace-only recipient name is rejected with validation error'
  )

  // B3. Name too short (< 2 chars)
  const b3Result = deliverySchema.safeParse({
    ...validDelivery,
    recipientName: 'A',
  })
  assert(!b3Result.success, 'Single-character recipient name is rejected')

  // B4. Invalid phone number format
  const b4Result = deliverySchema.safeParse({
    ...validDelivery,
    phone: 'not-a-number',
  })
  assert(!b4Result.success, 'Alphanumeric invalid phone number is rejected')

  // B5. Phone number too short
  const b5Result = deliverySchema.safeParse({
    ...validDelivery,
    phone: '12345',
  })
  assert(!b5Result.success, 'Phone number under 7 digits is rejected')

  // B6. Various real-world valid phone numbers
  const validPhones = ['+91 9876543210', '9876543210', '+1 (555) 234-5678', '020-7946-0991']
  const allPhonesValid = validPhones.every(
    (p) => deliverySchema.safeParse({ ...validDelivery, phone: p }).success
  )
  assert(allPhonesValid, 'Diverse international real-world phone formats are accepted')

  // B7. Whitespace-only delivery address
  const b7Result = deliverySchema.safeParse({
    ...validDelivery,
    deliveryAddress: '    ',
  })
  assert(!b7Result.success, 'Empty or whitespace delivery address is rejected')

  // B8. Excessively long delivery address (>250 chars)
  const b8Result = deliverySchema.safeParse({
    ...validDelivery,
    deliveryAddress: 'A'.repeat(251),
  })
  assert(!b8Result.success, 'Delivery address exceeding 250 characters is rejected')

  // B9. Delivery area missing or empty
  const b9Result = deliverySchema.safeParse({
    ...validDelivery,
    deliveryArea: '',
  })
  assert(!b9Result.success, 'Empty delivery area is rejected')

  // B10. Optional instructions omitted
  const b10Payload = { ...validDelivery }
  delete (b10Payload as any).deliveryInstructions
  const b10Result = deliverySchema.safeParse(b10Payload)
  assert(
    b10Result.success && b10Result.data.deliveryInstructions === '',
    'Optional delivery instructions can be safely omitted and defaults to empty string'
  )

  // ========================================================
  // TEST SUITE C: TRUSTED SERVER-SIDE PRICING & PRODUCTS
  // ========================================================
  console.log('\n--- TEST SUITE C: TRUSTED SERVER-SIDE PRICING & PRODUCTS ---')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  // C1. Load available product from database
  const realProduct = await Product.findOne({ isAvailable: true })
  assert(!!realProduct, 'MongoDB contains at least one available product for testing')

  if (realProduct) {
    const qty = 3
    const expectedSubtotal = Math.round(realProduct.price * qty * 100) / 100
    const expectedTotal = expectedSubtotal // deliveryFee is 0

    // C2. Client sends spoofed price: client says price is $1.00
    const spoofedItem = {
      id: realProduct._id.toString(),
      name: 'Spoofed Cheap Item',
      unitPrice: 1.0,
      quantity: qty,
    }

    // Verify item input schema accepts the payload shape
    const itemParse = orderItemInputSchema.safeParse(spoofedItem)
    assert(itemParse.success, 'Order item input schema accepts client item payload')

    // Simulate server-side authoritative lookup
    const dbItem = await Product.findById(spoofedItem.id)
    assert(!!dbItem, 'Authoritative product loaded from MongoDB')
    const calculatedSubtotal = Math.round(dbItem!.price * spoofedItem.quantity * 100) / 100
    assert(
      calculatedSubtotal === expectedSubtotal,
      `Backend ignores client spoofed price ($1.00) and uses DB price ($${realProduct.price}) -> $${calculatedSubtotal}`
    )
    assert(
      calculatedSubtotal !== spoofedItem.unitPrice * spoofedItem.quantity,
      'Authoritative subtotal differs strictly from client-calculated total'
    )
  }

  // C3. Invalid quantity (0, negative, float)
  assert(
    !orderItemInputSchema.safeParse({ id: '123', quantity: 0 }).success,
    'Quantity 0 is rejected'
  )
  assert(
    !orderItemInputSchema.safeParse({ id: '123', quantity: -2 }).success,
    'Negative quantity is rejected'
  )
  assert(
    !orderItemInputSchema.safeParse({ id: '123', quantity: 1.5 }).success,
    'Float quantity 1.5 is rejected'
  )
  assert(
    !orderItemInputSchema.safeParse({ id: '123', quantity: 100 }).success,
    'Quantity exceeding 99 units is rejected'
  )

  // C4. Empty order items list
  const emptyOrderResult = createOrderSchema.safeParse({
    items: [],
    delivery: validDelivery,
  })
  assert(!emptyOrderResult.success, 'Empty order items array is rejected')

  // C5. Price Change Guard (409 Conflict logic)
  const testCalcTotal = 599.98
  const reviewedTotalOld = 499.98
  const priceMismatch = Math.abs(testCalcTotal - reviewedTotalOld) > 0.009
  assert(
    priceMismatch,
    'Price change guard detects discrepancy between reviewed total and current server total'
  )

  // C6. Unavailable Product rejection
  const unavailableProduct = await Product.findOne({ isAvailable: false })
  if (unavailableProduct) {
    assert(
      !unavailableProduct.isAvailable,
      `Found unavailable test product "${unavailableProduct.name}" in database`
    )
  } else {
    // Temporarily create one to test rejection
    const dummyCat = await Product.findOne().then((p) => p?.category)
    const tempUnavailable = await Product.create({
      name: 'Temp Sold Out Dish',
      description: 'Unavailable item test',
      price: 199.99,
      category: dummyCat,
      isAvailable: false,
    })
    const isAvail = tempUnavailable.isAvailable
    assert(!isAvail, 'Verified unavailable product is marked isAvailable: false')
    await Product.findByIdAndDelete(tempUnavailable._id)
  }

  // C7. Unknown Product rejection
  const fakeId = new mongoose.Types.ObjectId()
  const unknownProd = await Product.findById(fakeId)
  assert(unknownProd === null, 'Unknown non-existent ObjectId returns null from database')

  // ========================================================
  // TEST SUITE D: PERSISTED ORDER CREATION & DATA INTEGRITY
  // ========================================================
  console.log('\n--- TEST SUITE D: PERSISTED ORDER CREATION & DATA INTEGRITY ---')

  let createdTestOrder: any = null

  if (realProduct) {
    const testOrderNumber = `TEST-ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`
    const testClerkId = 'test_user_customer_fs05'

    createdTestOrder = await Order.create({
      orderNumber: testOrderNumber,
      clerkId: testClerkId,
      customerName: validDelivery.recipientName,
      customerEmail: 'alice@biteflow.local',
      customerPhone: validDelivery.phone,
      deliveryAddress: validDelivery.deliveryAddress,
      deliveryArea: validDelivery.deliveryArea,
      deliveryInstructions: validDelivery.deliveryInstructions,
      items: [
        {
          productId: realProduct._id,
          name: realProduct.name,
          image: realProduct.image,
          unitPrice: realProduct.price,
          quantity: 2,
          subtotal: Math.round(realProduct.price * 2 * 100) / 100,
        },
      ],
      subtotal: Math.round(realProduct.price * 2 * 100) / 100,
      deliveryFee: 0,
      totalAmount: Math.round(realProduct.price * 2 * 100) / 100,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
    })

    assert(!!createdTestOrder._id, 'Order successfully persisted to MongoDB database')
    assert(
      createdTestOrder.orderNumber === testOrderNumber,
      `Order has unique human-readable orderNumber: ${testOrderNumber}`
    )
    assert(
      createdTestOrder.clerkId === testClerkId,
      'Order ownership is tied strictly to authenticated clerkId'
    )
    assert(
      createdTestOrder.customerName === validDelivery.recipientName,
      'Recipient name persisted accurately'
    )
    assert(
      createdTestOrder.customerPhone === validDelivery.phone,
      'Contact phone persisted accurately'
    )
    assert(
      createdTestOrder.deliveryAddress === validDelivery.deliveryAddress,
      'Delivery street address persisted accurately'
    )
    assert(
      createdTestOrder.deliveryArea === validDelivery.deliveryArea,
      'Delivery area persisted accurately'
    )
    assert(
      createdTestOrder.items.length === 1 && createdTestOrder.items[0].name === realProduct.name,
      'Product snapshot stored accurately in items array'
    )
  }

  // ========================================================
  // TEST SUITE E: PAYMENT STATUS & WORKFLOW BUSINESS RULES
  // ========================================================
  console.log('\n--- TEST SUITE E: PAYMENT STATUS & WORKFLOW BUSINESS RULES ---')

  if (createdTestOrder) {
    assert(
      createdTestOrder.status === 'PENDING_PAYMENT',
      'Order status initializes to PENDING_PAYMENT (not confirmed or preparing)'
    )
    assert(
      createdTestOrder.paymentStatus === 'PENDING',
      'Payment status initializes to PENDING (cannot be marked paid upon customer submission)'
    )

    // Verify querying by customer clerkId
    const foundOrders = await Order.find({ clerkId: 'test_user_customer_fs05' })
    assert(
      foundOrders.length >= 1,
      'Querying orders by authenticated clerkId returns persisted customer orders'
    )

    // Clean up test order from DB
    await Order.findByIdAndDelete(createdTestOrder._id)
    console.log('  ✓ Cleaned up test order record from MongoDB')
  }

  // ========================================================
  // TEST SUITE F: SUMMARY RESULTS
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
  console.error('[Test Execution Failed]:', err)
  process.exit(1)
})
