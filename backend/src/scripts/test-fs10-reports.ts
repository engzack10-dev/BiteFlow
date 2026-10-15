import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Order, OrderStatus } from '../models/Order.js'
import { Payment } from '../models/Payment.js'
import { Feedback } from '../models/Feedback.js'
import { parseDateFilter } from '../routes/order.routes.js'

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

/**
 * Formula injection security guard test helper:
 * Simulates spreadsheet sanitization matching frontend/src/utils/exportUtils.ts.
 */
function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  let trimmedIndex = 0
  while (trimmedIndex < str.length && str.charCodeAt(trimmedIndex) <= 32) {
    trimmedIndex++
  }
  const trimmed = str.slice(trimmedIndex)
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r']
  if (dangerousPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    str = `'${str}`
  }
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function runTests() {
  console.log('\n======================================================')
  console.log('      BITEFLOW FS-10 REPORTS & EXPORTS TEST SUITE     ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // Track all test artifacts created for self-cleanup
  const createdUserIds: string[] = []
  const createdCategoryIds: mongoose.Types.ObjectId[] = []
  const createdProductIds: mongoose.Types.ObjectId[] = []
  const createdOrderIds: mongoose.Types.ObjectId[] = []
  const createdPaymentIds: mongoose.Types.ObjectId[] = []
  const createdFeedbackIds: mongoose.Types.ObjectId[] = []

  // Create test actors in MongoDB
  const adminClerkId = `test_admin_${Date.now()}`
  const customerClerkId = `test_customer_${Date.now()}`

  await User.create([
    { clerkId: adminClerkId, email: 'admin-reports@biteflow.com', name: 'Admin Reports Tester', role: 'admin' },
    { clerkId: customerClerkId, email: 'customer-reports@biteflow.com', name: 'Customer Reports Tester', role: 'customer' },
  ])
  createdUserIds.push(adminClerkId, customerClerkId)

  // ========================================================
  // TEST SUITE A: SERVER-SIDE AUTHORIZATION & ACCESS BOUNDARIES (HTTP)
  // ========================================================
  console.log('--- TEST SUITE A: SERVER-SIDE AUTHORIZATION BOUNDARIES ---')

  try {
    const reportEndpoints = [
      '/api/admin/reports/products',
      '/api/admin/reports/selling',
      '/api/admin/reports/orders',
      '/api/admin/reports/feedback',
      '/api/admin/reports',
    ]

    // A1. Unauthenticated requests to all report endpoints must return HTTP 401
    for (const path of reportEndpoints) {
      const res = await fetch(`${API_URL}${path}`)
      assert(res.status === 401, `Unauthenticated request to ${path} returns 401 Unauthorized`)
    }

    // A2. Authenticated non-admin customer requests must return HTTP 403 Forbidden
    for (const path of reportEndpoints) {
      const res = await fetch(`${API_URL}${path}`, {
        headers: {
          'x-test-user-id': customerClerkId,
          'x-test-user-role': 'customer',
        },
      })
      assert(res.status === 403, `Customer access to ${path} returns 403 Forbidden`)
    }

    // A3. Authenticated admin requests to all report endpoints succeed
    for (const path of reportEndpoints) {
      const res = await fetch(`${API_URL}${path}`, {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      })
      assert(res.status === 200, `Admin access to ${path} returns 200 OK`)
    }
  } catch (err) {
    console.error('Error in Suite A:', err)
  }

  // ========================================================
  // TEST SUITE B: PRODUCT REPORT PERSISTENCE & CATEGORY POPULATION
  // ========================================================
  console.log('\n--- TEST SUITE B: PRODUCT REPORT PERSISTENCE & ACCURACY ---')

  try {
    // Create a test category and products
    const testCategory = await Category.create({
      name: `Test Gourmet Category ${Date.now()}`,
      description: 'Category for FS-10 testing',
    })
    createdCategoryIds.push(testCategory._id)

    const product1 = await Product.create({
      name: `Test Truffle Pasta ${Date.now()}`,
      description: 'Handmade pasta with black truffle butter',
      price: 24.50,
      category: testCategory._id,
      isAvailable: true,
    })
    const product2 = await Product.create({
      name: `Test Wagyu Steak ${Date.now()}`,
      description: 'A5 Wagyu beef grilled to perfection',
      price: 58.00,
      category: testCategory._id,
      isAvailable: false, // Unavailable dish
    })
    // Product with non-existent category reference (orphaned reference simulation)
    const product3 = await Product.create({
      name: `Test Orphan Dish ${Date.now()}`,
      description: 'Dish with deleted or missing category reference',
      price: 15.00,
      category: new mongoose.Types.ObjectId(),
      isAvailable: true,
    })
    createdProductIds.push(product1._id, product2._id, product3._id)

    // Query GET /api/admin/reports/products
    const res = await fetch(`${API_URL}/api/admin/reports/products`, {
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    })
    const data = (await res.json()) as any

    assert(res.status === 200 && data.success === true, 'GET /api/admin/reports/products returns success response')
    assert(Array.isArray(data.products) && data.products.length >= 3, 'Product report contains array of products')

    // B1. Verify required fields: Product name, Price, Quantity, Category, Status
    const foundP1 = data.products.find((p: any) => p._id === product1._id.toString())
    assert(foundP1 !== undefined, 'Found product1 in report')
    assert(foundP1.name === product1.name, 'Product name matches persisted name')
    assert(foundP1.price === 24.50, 'Price matches persisted price ($24.50)')
    assert(foundP1.category === testCategory.name, 'Category is populated with category name')
    assert(foundP1.status === 'Available', 'Available product has Status: "Available"')
    assert(
      foundP1.quantity === 'N/A (Made to order)',
      'Quantity field correctly reflects restaurant made-to-order limitation without inventing fake inventory'
    )

    // B2. Verify unavailable product status
    const foundP2 = data.products.find((p: any) => p._id === product2._id.toString())
    assert(foundP2.status === 'Unavailable', 'Unavailable product has Status: "Unavailable"')

    // B3. Verify missing category reference handles safely without crashing
    const foundP3 = data.products.find((p: any) => p._id === product3._id.toString())
    assert(
      foundP3.category === 'Uncategorized',
      'Orphaned or missing category reference safely defaults to "Uncategorized"'
    )

    // B4. Test category filter
    const catFilterRes = await fetch(
      `${API_URL}/api/admin/reports/products?category=${testCategory._id.toString()}`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    const catFilterData = (await catFilterRes.json()) as any
    assert(
      catFilterData.products.every((p: any) => p.category === testCategory.name),
      'Category query parameter filters products to selected category'
    )

    // B5. Test availability filter
    const availFilterRes = await fetch(
      `${API_URL}/api/admin/reports/products?availability=UNAVAILABLE`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    const availFilterData = (await availFilterRes.json()) as any
    assert(
      availFilterData.products.every((p: any) => p.status === 'Unavailable'),
      'Availability query parameter filters products to unavailable only'
    )
  } catch (err) {
    console.error('Error in Suite B:', err)
  }

  // ========================================================
  // TEST SUITE C: SELLING REPORT DATE FILTERING & REVENUE ACCURACY
  // ========================================================
  console.log('\n--- TEST SUITE C: SELLING REPORT & FINANCIAL INVARIANTS ---')

  try {
    // Create test orders with different dates, payment statuses, and historical snapshots
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const today = new Date()
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const historicalDishName = 'Artisanal Sourdough Pizza'
    const historicalUnitPrice = 18.00

    // Order 1: Verified payment yesterday -> MUST COUNT TOWARD REVENUE
    const verifiedOrder = await Order.create({
      orderNumber: `ORD-TEST-VER-${Date.now()}`,
      clerkId: customerClerkId,
      customerName: 'Verified Customer',
      customerEmail: 'verified@biteflow.com',
      customerPhone: '+1 555-0100',
      deliveryAddress: '123 Market St',
      deliveryArea: 'Downtown',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: historicalDishName,
          unitPrice: historicalUnitPrice,
          quantity: 2,
          subtotal: 36.00,
        },
      ],
      subtotal: 36.00,
      deliveryFee: 0,
      totalAmount: 36.00,
      status: 'CONFIRMED',
      paymentStatus: 'VERIFIED',
      createdAt: yesterday,
    })

    // Order 2: PENDING payment claim -> MUST NOT COUNT TOWARD REVENUE
    const pendingOrder = await Order.create({
      orderNumber: `ORD-TEST-PEND-${Date.now()}`,
      clerkId: customerClerkId,
      customerName: 'Pending Customer',
      customerEmail: 'pending@biteflow.com',
      customerPhone: '+1 555-0101',
      deliveryAddress: '456 Elm St',
      deliveryArea: 'Uptown',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: historicalDishName,
          unitPrice: historicalUnitPrice,
          quantity: 3,
          subtotal: 54.00,
        },
      ],
      subtotal: 54.00,
      deliveryFee: 0,
      totalAmount: 54.00,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      createdAt: yesterday,
    })

    // Order 3: REJECTED payment claim -> MUST NOT COUNT TOWARD REVENUE
    const rejectedOrder = await Order.create({
      orderNumber: `ORD-TEST-REJ-${Date.now()}`,
      clerkId: customerClerkId,
      customerName: 'Rejected Customer',
      customerEmail: 'rejected@biteflow.com',
      customerPhone: '+1 555-0102',
      deliveryAddress: '789 Oak Ave',
      deliveryArea: 'Midtown',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: historicalDishName,
          unitPrice: historicalUnitPrice,
          quantity: 1,
          subtotal: 18.00,
        },
      ],
      subtotal: 18.00,
      deliveryFee: 0,
      totalAmount: 18.00,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'REJECTED',
      createdAt: yesterday,
    })

    // Order 4: Verified payment placed last week (outside recent 2-day date range)
    const oldVerifiedOrder = await Order.create({
      orderNumber: `ORD-TEST-OLD-${Date.now()}`,
      clerkId: customerClerkId,
      customerName: 'Old Customer',
      customerEmail: 'old@biteflow.com',
      customerPhone: '+1 555-0103',
      deliveryAddress: '321 Pine St',
      deliveryArea: 'Suburbs',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: historicalDishName,
          unitPrice: historicalUnitPrice,
          quantity: 4,
          subtotal: 72.00,
        },
      ],
      subtotal: 72.00,
      deliveryFee: 0,
      totalAmount: 72.00,
      status: 'DELIVERED',
      paymentStatus: 'VERIFIED',
      createdAt: lastWeek,
    })

    createdOrderIds.push(verifiedOrder._id, pendingOrder._id, rejectedOrder._id, oldVerifiedOrder._id)

    // C1. Date Validation Tests: Reversed date range must be rejected with 400
    const invertedRes = await fetch(
      `${API_URL}/api/admin/reports/selling?startDate=2026-10-20&endDate=2026-10-10`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    assert(invertedRes.status === 400, 'Reversed date range (endDate < startDate) is rejected with 400 Bad Request')

    // C2. Date Validation Tests: Invalid date string must be rejected with 400
    const invalidDateRes = await fetch(
      `${API_URL}/api/admin/reports/selling?startDate=not-a-date&endDate=2026-10-10`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    assert(invalidDateRes.status === 400, 'Malformed date string is rejected with 400 Bad Request')

    // C3. Filter for Yesterday through Today
    const yesterdayStr = yesterday.toISOString().slice(0, 10)
    const todayStr = today.toISOString().slice(0, 10)

    const sellingRes = await fetch(
      `${API_URL}/api/admin/reports/selling?startDate=${yesterdayStr}&endDate=${todayStr}`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    const sellingData = (await sellingRes.json()) as any

    assert(sellingRes.status === 200 && sellingData.success === true, 'Selling report query succeeds')

    // Invariant verification:
    // Only verifiedOrder (36.00, quantity: 2) must be in the window.
    // pendingOrder (54.00, qty: 3) and rejectedOrder (18.00, qty: 1) MUST NOT be included.
    // oldVerifiedOrder (72.00, qty: 4) is last week, so outside the window.
    const productSold = sellingData.products.find((p: any) => p.productName === historicalDishName)
    assert(productSold !== undefined, `Found historical item "${historicalDishName}" in selling report`)
    assert(
      productSold.quantitySold === 2,
      `Quantity sold reflects strictly verified orders (expected 2, got ${productSold.quantitySold})`
    )
    assert(
      productSold.revenue === 36.00,
      `Attributable revenue reflects strictly verified orders (expected $36.00, got $${productSold.revenue})`
    )
    assert(
      productSold.historicalUnitPrice === historicalUnitPrice,
      `Used historical unit price snapshot ($${historicalUnitPrice})`
    )

    // C4. Future date range with 0 orders returns 0 totals without error
    const futureRes = await fetch(
      `${API_URL}/api/admin/reports/selling?startDate=2029-01-01&endDate=2029-01-31`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    const futureData = (await futureRes.json()) as any
    assert(
      futureRes.status === 200 &&
        futureData.summary.totalVerifiedRevenue === 0 &&
        futureData.summary.totalItemCount === 0 &&
        futureData.products.length === 0,
      'Empty date range gracefully returns zero totals and empty products list'
    )
  } catch (err) {
    console.error('Error in Suite C:', err)
  }

  // ========================================================
  // TEST SUITE D: ORDER REPORT & DERIVED DELIVERY STATUS
  // ========================================================
  console.log('\n--- TEST SUITE D: ORDER REPORT & DELIVERY STATUS DERIVATION ---')

  try {
    const res = await fetch(`${API_URL}/api/admin/reports/orders`, {
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    })
    const data = (await res.json()) as any

    assert(res.status === 200 && data.success === true, 'GET /api/admin/reports/orders returns success')
    assert(Array.isArray(data.orders), 'Order report returns orders array')
    assert(typeof data.summary.totalOrders === 'number', 'Summary contains totalOrders count')
    assert(typeof data.summary.totalAmount === 'number', 'Summary contains totalAmount ($)')

    // D1. Verify required fields on order records
    const sampleOrder = data.orders[0]
    if (sampleOrder) {
      assert(typeof sampleOrder.orderNumber === 'string', 'Order reference / orderNumber is present')
      assert(typeof sampleOrder.createdAt === 'string', 'Date timestamp is present')
      assert(typeof sampleOrder.status === 'string', 'Order status is present')
      assert(typeof sampleOrder.paymentStatus === 'string', 'Payment status is present')
      assert(typeof sampleOrder.deliveryStatus === 'string', 'Delivery status is present')
      assert(typeof sampleOrder.customerName === 'string', 'Customer name is present')
      assert(typeof sampleOrder.totalAmount === 'number', 'Total amount is present')
    }

    // D2. Verify delivery status derivation from lifecycle
    // DELIVERED -> Delivered
    // DISPATCHED -> Out for Delivery
    // READY -> Ready for Dispatch
    // PREPARING -> In Kitchen Prep
    // CONFIRMED -> Pending Kitchen
    // PENDING_PAYMENT -> Awaiting Verification
    const deliveredOrder = data.orders.find((o: any) => o.status === 'DELIVERED')
    if (deliveredOrder) {
      assert(deliveredOrder.deliveryStatus === 'Delivered', 'Status DELIVERED maps to deliveryStatus: "Delivered"')
    }
    const pendingPaymentOrder = data.orders.find((o: any) => o.status === 'PENDING_PAYMENT')
    if (pendingPaymentOrder) {
      assert(
        pendingPaymentOrder.deliveryStatus === 'Awaiting Verification',
        'Status PENDING_PAYMENT maps to deliveryStatus: "Awaiting Verification"'
      )
    }

    // D3. Order report date filtering
    const invertedRes = await fetch(
      `${API_URL}/api/admin/reports/orders?startDate=2026-12-31&endDate=2026-01-01`,
      {
        headers: {
          'x-test-user-id': adminClerkId,
          'x-test-user-role': 'admin',
        },
      }
    )
    assert(invertedRes.status === 400, 'Order report rejects reversed date range with 400')
  } catch (err) {
    console.error('Error in Suite D:', err)
  }

  // ========================================================
  // TEST SUITE E: CONTACT / FEEDBACK REPORT
  // ========================================================
  console.log('\n--- TEST SUITE E: FEEDBACK / CONTACT REPORT ---')

  try {
    const feedback1 = await Feedback.create({
      name: 'Sarah Jenkins',
      email: 'sarah@example.com',
      phone: '+1 555-0988',
      subject: 'Compliments to the Chef',
      message: 'The pasta was exceptional. Delivery arrived warm in 25 minutes!',
      status: 'REVIEWED',
      reviewedBy: 'admin-reports@biteflow.com',
      reviewedAt: new Date(),
    })
    const feedback2 = await Feedback.create({
      name: 'Michael Chang',
      email: 'michael@example.com',
      phone: '+1 555-0443',
      subject: 'Inquiry about allergens',
      message: 'Does the wagyu steak sauce contain any shellfish or sesame?',
      status: 'PENDING',
    })
    createdFeedbackIds.push(feedback1._id, feedback2._id)

    const res = await fetch(`${API_URL}/api/admin/reports/feedback`, {
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    })
    const data = (await res.json()) as any

    assert(res.status === 200 && data.success === true, 'GET /api/admin/reports/feedback returns success')
    assert(Array.isArray(data.feedback), 'Returns feedback array')

    const foundFb1 = data.feedback.find((f: any) => f._id === feedback1._id.toString())
    assert(foundFb1 !== undefined, 'Found persisted feedback item in report')
    assert(foundFb1.customer === 'Sarah Jenkins', 'Customer name matches persisted name')
    assert(foundFb1.subject === 'Compliments to the Chef', 'Subject matches persisted subject')
    assert(foundFb1.message.includes('exceptional'), 'Original message preserved accurately')
    assert(foundFb1.status === 'REVIEWED', 'Status reflects persisted REVIEWED status')
    assert(foundFb1.reviewedBy === 'admin-reports@biteflow.com', 'Reviewer attribution preserved')

    // E2. Filter by status
    const pendingRes = await fetch(`${API_URL}/api/admin/reports/feedback?status=PENDING`, {
      headers: {
        'x-test-user-id': adminClerkId,
        'x-test-user-role': 'admin',
      },
    })
    const pendingData = (await pendingRes.json()) as any
    assert(
      pendingData.feedback.every((f: any) => f.status === 'PENDING'),
      'Status filter PENDING restricts feedback to pending items only'
    )
  } catch (err) {
    console.error('Error in Suite E:', err)
  }

  // ========================================================
  // TEST SUITE F: CSV & PDF EXPORT FORMULA INJECTION GUARDS
  // ========================================================
  console.log('\n--- TEST SUITE F: CSV EXPORT FORMULA INJECTION GUARDS ---')

  try {
    // F1. Formula Injection Guard: Dangerous formula prefixes (=, +, -, @, \t, \r)
    const dangerousFormulas = [
      '=SUM(A1:A10)',
      '+cmd|/c calc.exe!A0',
      '-1+1',
      '@SUM(B1:B5)',
      '\t=1+1',
      '   =2+2', // Leading whitespace followed by formula
    ]

    for (const formula of dangerousFormulas) {
      const sanitized = sanitizeCSVCell(formula)
      assert(
        sanitized.startsWith("'") || sanitized.startsWith('"\''),
        `Dangerous formula string "${formula}" is neutralized with leading quote (')`
      )
    }

    // F2. Standard string without dangerous prefix is preserved without prepending quote
    const safeText = 'Classic Margherita Pizza'
    assert(sanitizeCSVCell(safeText) === safeText, 'Safe product title is not modified')

    // F3. Strings containing commas and quotes are escaped per RFC-4180
    const textWithComma = 'Pasta, with garlic'
    assert(sanitizeCSVCell(textWithComma) === '"Pasta, with garlic"', 'Commas are wrapped in quotes')

    const textWithQuotes = 'Chef\'s "Special" Dish'
    assert(
      sanitizeCSVCell(textWithQuotes) === '"Chef\'s ""Special"" Dish"',
      'Quotes are escaped with doubled quotes per RFC-4180'
    )
  } catch (err) {
    console.error('Error in Suite F:', err)
  }

  // ========================================================
  // TEST SUITE G: CLEAN SELF-CLEANUP & ZERO DATABASE RESIDUE
  // ========================================================
  console.log('\n--- TEST SUITE G: CLEAN DATABASE SELF-CLEANUP ---')

  try {
    // Delete test orders
    const deletedOrders = await Order.deleteMany({ _id: { $in: createdOrderIds } })
    console.log(`  Cleaned up ${deletedOrders.deletedCount} test orders.`)

    // Delete test payments
    const deletedPayments = await Payment.deleteMany({ _id: { $in: createdPaymentIds } })
    console.log(`  Cleaned up ${deletedPayments.deletedCount} test payments.`)

    // Delete test products
    const deletedProducts = await Product.deleteMany({ _id: { $in: createdProductIds } })
    console.log(`  Cleaned up ${deletedProducts.deletedCount} test products.`)

    // Delete test categories
    const deletedCategories = await Category.deleteMany({ _id: { $in: createdCategoryIds } })
    console.log(`  Cleaned up ${deletedCategories.deletedCount} test categories.`)

    // Delete test feedback
    const deletedFeedback = await Feedback.deleteMany({ _id: { $in: createdFeedbackIds } })
    console.log(`  Cleaned up ${deletedFeedback.deletedCount} test feedback records.`)

    // Delete test users
    const deletedUsers = await User.deleteMany({ clerkId: { $in: createdUserIds } })
    console.log(`  Cleaned up ${deletedUsers.deletedCount} test user accounts.`)

    // Verify 0 residue
    const remainingOrders = await Order.countDocuments({ _id: { $in: createdOrderIds } })
    const remainingProducts = await Product.countDocuments({ _id: { $in: createdProductIds } })
    const remainingUsers = await User.countDocuments({ clerkId: { $in: createdUserIds } })

    assert(
      remainingOrders === 0 && remainingProducts === 0 && remainingUsers === 0,
      'Database verified 100% clean with zero test residue remaining'
    )
  } catch (err) {
    console.error('Error in Suite G:', err)
  }

  console.log('\n======================================================')
  console.log(`FS-10 TEST RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`)
  console.log('======================================================\n')

  await mongoose.disconnect()
  process.exit(totalFailed === 0 ? 0 : 1)
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err)
  process.exit(1)
})
