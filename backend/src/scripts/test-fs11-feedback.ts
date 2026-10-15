import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Feedback } from '../models/Feedback.js'
import { createFeedbackSchema } from '../routes/feedback.routes.js'
import { updateFeedbackStatusSchema } from '../routes/admin.routes.js'

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
  console.log('   BITEFLOW FS-11 CONTACT & FEEDBACK TEST SUITE       ')
  console.log('======================================================\n')

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/biteflow'
  await mongoose.connect(uri)

  const API_URL = 'http://localhost:5000'

  // Track created records for 100% self-cleanup
  const createdUserIds: string[] = []
  const createdFeedbackIds: mongoose.Types.ObjectId[] = []

  // Ensure test accounts
  const testAdminClerkId = `test_admin_fs11_${Date.now()}`
  const testCustomerClerkId = `test_customer_fs11_${Date.now()}`

  const adminUser = await User.create({
    clerkId: testAdminClerkId,
    email: `admin_fs11_${Date.now()}@biteflow.com`,
    name: 'Admin FS11 Tester',
    role: 'admin',
  })
  createdUserIds.push(testAdminClerkId)

  const customerUser = await User.create({
    clerkId: testCustomerClerkId,
    email: `customer_fs11_${Date.now()}@example.com`,
    name: 'Customer FS11 Tester',
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

  try {
    // ========================================================
    // TEST SUITE A: SERVER-SIDE AUTHORIZATION & ACCESS CONTROL
    // ========================================================
    console.log('--- TEST SUITE A: SERVER-SIDE AUTHORIZATION & ACCESS CONTROL ---')

    // A1. Unauthenticated requests to Admin feedback endpoint must receive 401
    const unauthGetRes = await fetch(`${API_URL}/api/admin/feedback`)
    assert(
      unauthGetRes.status === 401,
      'Unauthenticated GET /api/admin/feedback rejected with HTTP 401',
      `Got status: ${unauthGetRes.status}`
    )

    // A2. Customer requests to Admin feedback endpoint must receive 403
    const customerGetRes = await fetch(`${API_URL}/api/admin/feedback`, {
      headers: customerHeaders,
    })
    assert(
      customerGetRes.status === 403,
      'Customer GET /api/admin/feedback rejected with HTTP 403 Forbidden',
      `Got status: ${customerGetRes.status}`
    )

    // A3. Unauthenticated requests to PATCH status endpoint must receive 401
    const unauthPatchRes = await fetch(`${API_URL}/api/admin/feedback/any-id/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVIEWED' }),
    })
    assert(
      unauthPatchRes.status === 401,
      'Unauthenticated PATCH /api/admin/feedback/:id/status rejected with HTTP 401',
      `Got status: ${unauthPatchRes.status}`
    )

    // A4. Customer requests to PATCH status endpoint must receive 403
    const customerPatchRes = await fetch(`${API_URL}/api/admin/feedback/any-id/status`, {
      method: 'PATCH',
      headers: customerHeaders,
      body: JSON.stringify({ status: 'REVIEWED' }),
    })
    assert(
      customerPatchRes.status === 403,
      'Customer PATCH /api/admin/feedback/:id/status rejected with HTTP 403 Forbidden',
      `Got status: ${customerPatchRes.status}`
    )

    // A5. Unauthenticated requests to reports feedback endpoint receive 401
    const unauthReportRes = await fetch(`${API_URL}/api/admin/reports/feedback`)
    assert(
      unauthReportRes.status === 401,
      'Unauthenticated GET /api/admin/reports/feedback rejected with HTTP 401',
      `Got status: ${unauthReportRes.status}`
    )

    // A6. Customer requests to reports feedback endpoint receive 403
    const customerReportRes = await fetch(`${API_URL}/api/admin/reports/feedback`, {
      headers: customerHeaders,
    })
    assert(
      customerReportRes.status === 403,
      'Customer GET /api/admin/reports/feedback rejected with HTTP 403 Forbidden',
      `Got status: ${customerReportRes.status}`
    )

    // A7. Admin requests succeed with 200
    const adminGetRes = await fetch(`${API_URL}/api/admin/feedback`, {
      headers: adminHeaders,
    })
    assert(
      adminGetRes.status === 200,
      'Admin GET /api/admin/feedback granted with HTTP 200',
      `Got status: ${adminGetRes.status}`
    )

    // ========================================================
    // TEST SUITE B: PUBLIC SUBMISSION & VALIDATION RULES
    // ========================================================
    console.log('\n--- TEST SUITE B: PUBLIC SUBMISSION & VALIDATION RULES ---')

    // B1. Zod schema validation: rejects empty name
    const emptyNameParse = createFeedbackSchema.safeParse({
      name: '',
      email: 'test@example.com',
      subject: 'Valid Subject',
      message: 'Valid message body here',
    })
    assert(!emptyNameParse.success, 'Validation rejects empty name')

    // B2. Zod schema validation: rejects whitespace-only name
    const wsNameParse = createFeedbackSchema.safeParse({
      name: '   ',
      email: 'test@example.com',
      subject: 'Valid Subject',
      message: 'Valid message body here',
    })
    assert(!wsNameParse.success, 'Validation rejects whitespace-only name')

    // B3. Zod schema validation: rejects name shorter than 2 characters
    const shortNameParse = createFeedbackSchema.safeParse({
      name: 'A',
      email: 'test@example.com',
      subject: 'Valid Subject',
      message: 'Valid message body here',
    })
    assert(!shortNameParse.success, 'Validation rejects single-character name')

    // B4. Zod schema validation: rejects invalid email format
    const invalidEmailParse = createFeedbackSchema.safeParse({
      name: 'Alice Cooper',
      email: 'not-a-valid-email',
      subject: 'Valid Subject',
      message: 'Valid message body here',
    })
    assert(!invalidEmailParse.success, 'Validation rejects invalid email address')

    // B5. Zod schema validation: rejects whitespace-only message
    const wsMessageParse = createFeedbackSchema.safeParse({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      subject: 'Valid Subject',
      message: '      ',
    })
    assert(!wsMessageParse.success, 'Validation rejects whitespace-only message')

    // B6. Zod schema validation: rejects message shorter than 5 characters
    const shortMessageParse = createFeedbackSchema.safeParse({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      subject: 'Valid Subject',
      message: 'Hi',
    })
    assert(!shortMessageParse.success, 'Validation rejects message under 5 characters')

    // B7. Zod schema validation: rejects message exceeding 2000 characters
    const longMessageParse = createFeedbackSchema.safeParse({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      subject: 'Valid Subject',
      message: 'A'.repeat(2001),
    })
    assert(!longMessageParse.success, 'Validation rejects message exceeding 2000 characters')

    // B8. HTTP POST /api/feedback rejects invalid payload with 400
    const httpInvalidRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'B',
        email: 'invalid',
        subject: '',
        message: 'hi',
      }),
    })
    assert(
      httpInvalidRes.status === 400,
      'POST /api/feedback returns HTTP 400 with helpful error on invalid payload',
      `Got status: ${httpInvalidRes.status}`
    )
    const httpInvalidData = (await httpInvalidRes.json()) as any
    assert(
      httpInvalidData.success === false && typeof httpInvalidData.error === 'string',
      'HTTP 400 response provides actionable error message without stack trace'
    )

    // B9. Valid guest submission succeeds with 201 Created
    const guestFeedbackPayload = {
      name: 'Guest Diner',
      email: 'guest.diner@example.com',
      phone: '+1 555-0144',
      subject: 'Catering question for anniversary dinner',
      message: 'Hello, could you provide vegetarian catering for 20 guests this Saturday?',
    }
    const guestSubmitRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
      body: JSON.stringify(guestFeedbackPayload),
    })
    assert(
      guestSubmitRes.status === 201,
      'POST /api/feedback creates guest submission with HTTP 201',
      `Got status: ${guestSubmitRes.status}`
    )
    const guestSubmitData = (await guestSubmitRes.json()) as any
    assert(
      guestSubmitData.success === true && !!guestSubmitData.feedbackId,
      'POST /api/feedback returns success and server-generated feedbackId'
    )
    createdFeedbackIds.push(new mongoose.Types.ObjectId(guestSubmitData.feedbackId))

    // B10. Valid authenticated submission links clerkId
    const authFeedbackPayload = {
      name: 'Registered Customer',
      email: customerUser.email,
      phone: '+1 555-0188',
      subject: 'Packaging compliment',
      message: 'The biodegradable packaging kept our pizza perfectly crispy and hot!',
    }
    const authSubmitRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify(authFeedbackPayload),
    })
    assert(
      authSubmitRes.status === 201,
      'POST /api/feedback creates authenticated submission with HTTP 201',
      `Got status: ${authSubmitRes.status}`
    )
    const authSubmitData = (await authSubmitRes.json()) as any
    createdFeedbackIds.push(new mongoose.Types.ObjectId(authSubmitData.feedbackId))

    // B11. Verify MongoDB document stores initial status PENDING and links clerkId
    const authDoc = await Feedback.findById(authSubmitData.feedbackId)
    assert(authDoc !== null, 'Authenticated feedback document persists in MongoDB')
    assert(
      authDoc?.status === 'PENDING',
      'Feedback status is initialized to PENDING on the backend'
    )
    assert(
      authDoc?.clerkId === testCustomerClerkId,
      'Feedback attaches verified customer clerkId from authentication context'
    )

    // B12. Privilege escalation prevention: client cannot supply status or reviewedBy
    const tamperingPayload = {
      name: 'Hacker Attempt',
      email: 'hacker@example.com',
      subject: 'Attempting to inject reviewed status',
      message: 'Checking whether client-provided status overrides backend initial state.',
      status: 'REVIEWED',
      reviewedBy: 'self-admin',
      reviewedAt: new Date().toISOString(),
    }
    const tamperRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
      body: JSON.stringify(tamperingPayload),
    })
    const tamperData = (await tamperRes.json()) as any
    assert(tamperRes.status === 201, 'Tampering payload submits valid content')
    createdFeedbackIds.push(new mongoose.Types.ObjectId(tamperData.feedbackId))

    const tamperDoc = await Feedback.findById(tamperData.feedbackId)
    assert(
      tamperDoc?.status === 'PENDING',
      'Client-supplied status: REVIEWED was ignored; backend forced status: PENDING'
    )
    assert(
      tamperDoc?.reviewedBy === null || tamperDoc?.reviewedBy === undefined,
      'Client-supplied reviewedBy was ignored; remains null on backend'
    )

    // ========================================================
    // TEST SUITE C: ADMIN FEEDBACK MANAGEMENT & STATUS WORKFLOW
    // ========================================================
    console.log('\n--- TEST SUITE C: ADMIN MANAGEMENT & STATUS WORKFLOW ---')

    // C1. Admin listing returns submitted feedback records
    const listRes = await fetch(`${API_URL}/api/admin/feedback`, {
      headers: adminHeaders,
    })
    const listData = (await listRes.json()) as any
    assert(listRes.status === 200, 'GET /api/admin/feedback returns HTTP 200')
    assert(Array.isArray(listData.feedback), 'GET /api/admin/feedback returns feedback array')
    assert(typeof listData.pendingCount === 'number', 'Returns pendingCount counter')
    assert(
      listData.feedback.some((f: any) => f._id === authSubmitData.feedbackId),
      'Persisted customer submission appears in Admin feedback list'
    )

    // C2. Admin status filter: status=PENDING
    const pendingFilterRes = await fetch(`${API_URL}/api/admin/feedback?status=PENDING`, {
      headers: adminHeaders,
    })
    const pendingFilterData = (await pendingFilterRes.json()) as any
    assert(
      pendingFilterData.feedback.every((f: any) => f.status === 'PENDING'),
      'Admin status=PENDING filter restricts list to pending inquiries only'
    )

    // C3. Admin search filter by customer name or subject
    const searchRes = await fetch(
      `${API_URL}/api/admin/feedback?search=${encodeURIComponent('Packaging compliment')}`,
      { headers: adminHeaders }
    )
    const searchData = (await searchRes.json()) as any
    assert(searchRes.status === 200, 'GET /api/admin/feedback with search returns HTTP 200')
    assert(
      searchData.feedback.some((f: any) => f.subject === 'Packaging compliment'),
      'Admin search query finds feedback matching subject term'
    )

    // C4. Transition PENDING -> REVIEWED
    const reviewPatchRes = await fetch(
      `${API_URL}/api/admin/feedback/${authSubmitData.feedbackId}/status`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'REVIEWED' }),
      }
    )
    assert(
      reviewPatchRes.status === 200,
      'PATCH /api/admin/feedback/:id/status updates status to REVIEWED',
      `Got status: ${reviewPatchRes.status}`
    )
    const reviewedDoc = await Feedback.findById(authSubmitData.feedbackId)
    assert(reviewedDoc?.status === 'REVIEWED', 'Status updated to REVIEWED in MongoDB')
    assert(
      reviewedDoc?.reviewedBy === adminUser.email,
      'Reviewer identity stamped from verified admin session'
    )
    assert(reviewedDoc?.reviewedAt instanceof Date, 'reviewedAt timestamp recorded')
    assert(
      reviewedDoc?.message === authFeedbackPayload.message,
      'Status update preserves original customer message untouched'
    )
    assert(
      reviewedDoc?.subject === authFeedbackPayload.subject,
      'Status update preserves original customer subject untouched'
    )

    // C5. Transition REVIEWED -> ARCHIVED
    const archivePatchRes = await fetch(
      `${API_URL}/api/admin/feedback/${authSubmitData.feedbackId}/status`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'ARCHIVED' }),
      }
    )
    assert(archivePatchRes.status === 200, 'PATCH status to ARCHIVED succeeds with HTTP 200')
    const archivedDoc = await Feedback.findById(authSubmitData.feedbackId)
    assert(archivedDoc?.status === 'ARCHIVED', 'Status updated to ARCHIVED in MongoDB')

    // C6. Invalid status value is rejected with HTTP 400
    const invalidStatusRes = await fetch(
      `${API_URL}/api/admin/feedback/${authSubmitData.feedbackId}/status`,
      {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'DELETED' }),
      }
    )
    assert(
      invalidStatusRes.status === 400,
      'PATCH with invalid status DELETED rejected with HTTP 400',
      `Got status: ${invalidStatusRes.status}`
    )

    // C7. Non-existent feedback ID returns HTTP 404
    const fakeId = new mongoose.Types.ObjectId().toString()
    const notFoundRes = await fetch(`${API_URL}/api/admin/feedback/${fakeId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'REVIEWED' }),
    })
    assert(
      notFoundRes.status === 404,
      'PATCH on non-existent feedback ID returns HTTP 404 Not Found',
      `Got status: ${notFoundRes.status}`
    )

    // C8. Malformed feedback ID returns HTTP 404 safely without 500 crash
    const malformedIdRes = await fetch(`${API_URL}/api/admin/feedback/invalid-id/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'REVIEWED' }),
    })
    assert(
      malformedIdRes.status === 404,
      'PATCH on malformed ID returns safe HTTP 404 without internal server error',
      `Got status: ${malformedIdRes.status}`
    )

    // ========================================================
    // TEST SUITE D: FS-10 REPORT & EXPORT INTEGRATION
    // ========================================================
    console.log('\n--- TEST SUITE D: FS-10 REPORT & EXPORT INTEGRATION ---')

    // D1. Feedback report includes persisted feedback
    const reportRes = await fetch(`${API_URL}/api/admin/reports/feedback`, {
      headers: adminHeaders,
    })
    assert(reportRes.status === 200, 'GET /api/admin/reports/feedback returns HTTP 200')
    const reportData = (await reportRes.json()) as any
    assert(Array.isArray(reportData.feedback), 'Feedback report returns feedback array')
    assert(
      reportData.summary.totalCount >= 3,
      'Feedback report summary reflects total persisted feedback count'
    )

    // D2. Persisted status is reflected in report
    const foundArchivedItem = reportData.feedback.find(
      (f: any) => f._id === authSubmitData.feedbackId
    )
    assert(
      foundArchivedItem !== undefined && foundArchivedItem.status === 'ARCHIVED',
      'Feedback report reflects latest updated status ARCHIVED for managed record'
    )

    // D3. Status filter in feedback report
    const reportPendingRes = await fetch(
      `${API_URL}/api/admin/reports/feedback?status=PENDING`,
      { headers: adminHeaders }
    )
    const reportPendingData = (await reportPendingRes.json()) as any
    assert(
      reportPendingData.feedback.every((f: any) => f.status === 'PENDING'),
      'Feedback report status=PENDING filter restricts report items strictly to PENDING'
    )

    // D4. Formula injection safety check on message text
    const formulaPayload = {
      name: '=cmd|’ /C calc’!A0',
      email: 'security.tester@example.com',
      subject: '+123-SUM(A1:B10)',
      message: '@ATTACK_FORMULA_TESTING',
    }
    const formulaSubmitRes = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-bypass-rate-limit': 'true' },
      body: JSON.stringify(formulaPayload),
    })
    assert(formulaSubmitRes.status === 201, 'Feedback with formula characters stored safely')
    const formulaSubmitData = (await formulaSubmitRes.json()) as any
    createdFeedbackIds.push(new mongoose.Types.ObjectId(formulaSubmitData.feedbackId))

    const formulaReportRes = await fetch(`${API_URL}/api/admin/reports/feedback`, {
      headers: adminHeaders,
    })
    const formulaReportData = (await formulaReportRes.json()) as any
    const foundFormulaItem = formulaReportData.feedback.find(
      (f: any) => f._id === formulaSubmitData.feedbackId
    )
    assert(
      foundFormulaItem !== undefined && foundFormulaItem.customer === formulaPayload.name,
      'Feedback report preserves customer formula string verbatim in JSON API response'
    )
  } finally {
    // ========================================================
    // CLEANUP: 100% SELF-CLEANUP OF ALL TEST RECORDS
    // ========================================================
    console.log('\n--- CLEANUP: REMOVING TEST RECORDS ---')

    if (createdFeedbackIds.length > 0) {
      const deletedFeedback = await Feedback.deleteMany({ _id: { $in: createdFeedbackIds } })
      console.log(`  Removed ${deletedFeedback.deletedCount} test feedback records from MongoDB.`)
    }

    if (createdUserIds.length > 0) {
      const deletedUsers = await User.deleteMany({ clerkId: { $in: createdUserIds } })
      console.log(`  Removed ${deletedUsers.deletedCount} test user records from MongoDB.`)
    }

    await mongoose.disconnect()
  }

  console.log('\n======================================================')
  console.log(`   TOTAL TESTS PASSED: ${totalPassed}`)
  console.log(`   TOTAL TESTS FAILED: ${totalFailed}`)
  console.log('======================================================\n')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Unhandled test runner error:', err)
  process.exit(1)
})
