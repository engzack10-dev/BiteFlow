# BiteFlow Progress & Decisions

## Current phase
- FS-01 (Authentication & Roles): completed.
- FS-02 (Menu & Categories): completed.
- Frontend Modular Refactoring: completed.
- FS-03 (Customer Storefront): completed.
- FS-04 (Cart): completed (persistent CartDrawer accessible from storefront navigation, decimal-safe subtotal and order total calculations, quantity steppers with positive integer sanitization, empty cart state, localStorage persistence with validation and authoritative backend product reconciliation, unavailable item indicators, and checkout prevention on sold-out dishes).
- FS-05 (Checkout & Delivery): completed (Delivery information validation, 2-step review with authoritative server-calculated pricing, price change conflict guard, Clerk auth requirement, manual payment verification pending confirmation view, cart clearance upon order creation).
- FS-06 (Payment Submission & Verification): completed (Manual payment verification workflow, strict separation of payment and order statuses, Payment model with full audit history, kitchen safety invariants preventing orders from entering kitchen prep without verified payment, Admin payment queue with verify/reject workflows, and customer real-time payment tracking).
- FS-07 (Order Management): completed (Operational Admin order list, robust date range filtering with inclusive end-of-day handling, status subtabs, real-time search, detailed order inspection modal with persisted snapshots and delivery data, centralized order lifecycle state machine with kitchen payment verification safeguards, courier dispatch and delivery timestamp tracking, optimistic concurrency control via atomic conditional updates, and complete non-tamperable status audit history).
- FS-08 (Customer Order Tracking): completed.
- FS-09 (Admin Management): completed.
- FS-10 (Reports & Exports): completed.
- FS-11 (Contact & Customer Feedback): completed.
- FS-12 (Settings & System Integration): completed (Restaurant operational settings persistence, public vs admin access control, safe database initialization without manual intervention, live application-wide propagation to Header, Footer, Contact, and Checkout, system health endpoint, duplicate order idempotency guard, full customer-to-admin lifecycle integration from cart to delivery and reports).
- Project Status: All 12 Feature Specifications (FS-01 through FS-12) fully implemented, integrated, and verified end-to-end.

## Confirmed
- One restaurant
- Delivery only
- Customer accounts & Admin role (FS-01 implemented and verified with Clerk + Express + MongoDB)
- Menu & Categories (FS-02 implemented and verified with Category/Product CRUD, safe deletion, and availability checks)
- Server-side role enforcement (requireRole middleware: customer / admin)
- Unavailable products cannot be purchased (enforced server-side)
- Payment requires admin verification before preparation
- Purchased/submitted orders cannot be cancelled
- Currency: USD ($) across entire customer and admin experiences
- Product, selling, order, and contact/feedback reports
- CSV/PDF exports where specified
- React + TypeScript + Vite (Frontend)
- Node.js + Express + TypeScript + Mongoose (Backend)
- Light/dark mode
- Premium/elegant/warm restaurant brand
- Wordmark logo

## Confirmed Cart Decisions (FS-04)
- **State Management**: Single source of truth via `useCart` hook consumed by storefront, `CartDrawer`, and `CartPage`.
- **Persistence**: Automatic `localStorage` (`biteflow_cart`) synchronization with schema validation on restore.
- **Reconciliation**: Authoritative prices, names, and images reconciled from backend `products`; unavailable items flagged in cart and blocked from checkout until removed.
- **Calculations**: Float-safe cent-based math (`calculateItemSubtotal`, `calculateCartSubtotal`, `calculateOrderTotal`).
- **Cart Drawer**: Responsive slide-out accessible from navigation, dialog semantics, Escape key listener, and light/dark theme support.
- **Verification**: 26/26 unit and contract tests passed, production bundle builds with 0 errors.

## Confirmed Checkout & Delivery Decisions (FS-05)
- **Authentication**: Strict Clerk auth guard in `CheckoutModal` and server-level `requireAuth` on all `/api/orders` endpoints. Unauthenticated requests receive HTTP 401.
- **Delivery Validation**: Enforces recipient name (2-100 chars), phone number (7-25 chars with regex), street address (5-250 chars), area/neighborhood (2-100 chars), and optional instructions (<=300 chars) via client form feedback and server Zod schemas (`deliverySchema`).
- **Authoritative Server Pricing**: Client totals are never trusted for order financial records. `POST /api/orders/review` recalculates items, subtotal, and delivery fee directly from MongoDB product prices.
- **Price Change Guard (HTTP 409)**: If inventory prices change between user review and submission, `POST /api/orders` returns `409 Conflict` with `PRICE_CHANGED` code and updated totals, prompting user re-confirmation.
- **Order State Separation**: Placed orders initialize with `status: PENDING_PAYMENT` and `paymentStatus: PENDING`. Payment cannot be marked as verified at order submission.
- **Post-Checkout Lifecycle**: Cart is cleared only after server returns `201 Created` with a persisted order. Modal displays confirmation with `orderNumber`, status badges, delivery snapshot, and pending payment notification.
- **Verification**: 37/37 automated test assertions passed (`test-fs05-checkout.ts`), TypeScript builds pass cleanly with 0 errors on both frontend and backend, ESLint passes with 0 errors.

## Confirmed Payment Submission & Verification Decisions (FS-06)
- **Currency**: Standardized to **USD ($)** across the application.
- **Dedicated Payment Data Model**: Created `Payment.ts` with `paymentNumber`, `orderId`, `clerkId`, `customerName`, `amount` (derived exclusively from authoritative order total), `currency: 'USD'`, status (`PENDING | VERIFIED | REJECTED`), timestamps, and `auditHistory`.
- **Order Model Extension**: `Order.ts` updated with `paymentId` reference and `paymentRejectionReason`.
- **Payment Lifecycle & Workflow**:
  1. Customer completes checkout -> persisted `Payment` record created with status `PENDING`.
  2. Order initialized in `PENDING_PAYMENT` state with `paymentStatus: 'PENDING'`.
  3. Authoritative restaurant Admin verifies actual bank receipt / merchant notification.
  4. Admin verification transitions Payment to `VERIFIED` and Order to `CONFIRMED`.
  5. Admin rejection requires a validated reason (3-300 chars), transitions Payment to `REJECTED`, records rejection reason, and keeps Order in `PENDING_PAYMENT`.
- **Kitchen Safety Invariants**:
  - Orders cannot transition to `CONFIRMED`, `PREPARING`, `READY`, etc., unless `order.paymentStatus === 'VERIFIED'`.
  - Backend order status modification endpoint `PATCH /api/orders/:id/status` enforces this check strictly server-side.
  - An order with `PENDING` or `REJECTED` payment is strictly rejected from kitchen preparation with `HTTP 400 Bad Request`.
  - An already verified payment cannot be re-verified or rejected (`HTTP 409 Conflict`).
  - An already rejected payment cannot be directly verified (`HTTP 409 Conflict`).
- **Audit History**:
  - Non-tamperable append-only audit trail on `Payment.auditHistory` capturing event action (`SUBMITTED`, `VERIFIED`, `REJECTED`), previous status, new status, actor identity (`actorId`, `actorRole`, `actorEmail`), server timestamp, and optional admin notes/rejection reasons.
  - Customers cannot edit or delete audit trail entries.
- **Admin Dashboard Integration**:
  - Added "Payment Verification" tab to Admin Portal with real-time pending badge counter.
  - Queue supports sub-filtering (`Pending`, `All Records`, `Verified`, `Rejected`).
  - Provides quick action triggers for verification, rejection with reason dialog, and full audit timeline inspection.
- **Customer Real-Time Tracking**:
  - Added `MyOrdersModal` component accessible from Header for signed-in users.
  - Displays customer order cards with real-time payment status badges, items, totals, delivery details, and customer-appropriate rejection reasons.
- **Automated Validation**:
  - `backend`: 38/38 assertions passed in `test-fs06-payments.ts` across Suites A through G.
  - `backend`: 37/37 assertions passed in `test-fs05-checkout.ts` regression suite.
  - Both frontend and backend TypeScript builds (`tsc`) pass with 0 errors.
  - ESLint checks pass with 0 errors.

## Confirmed Order Management Decisions (FS-07)
- **Status Machine & Lifecycle**:
  - Centralized, strictly enforced lifecycle transitions:
    `PENDING_PAYMENT` → `CONFIRMED` → `PREPARING` → `READY` → `DISPATCHED` → `DELIVERED`
  - Rejection of state-skipping (e.g. `CONFIRMED` to `READY`) and backward transitions (e.g. `READY` to `PREPARING`).
  - Terminal state `DELIVERED` permits no subsequent status updates.
- **Payment Verification Safeguards & Kitchen Protection**:
  - `PENDING_PAYMENT` orders cannot transition to `CONFIRMED` manually via the order status endpoint without trusted payment verification.
  - An order with `PENDING` or `REJECTED` payment cannot enter kitchen preparation (`PREPARING`) or subsequent fulfillment stages (`HTTP 400 Bad Request`).
  - Kitchen preparation begins strictly after payment status is `VERIFIED` via the FS-06 verification workflow.
- **Order Model Extensions & Compound Indexes**:
  - Extended `Order.ts` with:
    - `statusHistory`: Array of `IOrderStatusHistory` recording `previousStatus`, `newStatus`, `timestamp`, `actorId`, `actorRole` (`'admin' | 'customer' | 'system'`), `actorEmail`, and `note`.
    - Fulfillment tracking: `dispatchedAt`, `dispatchedBy`, `deliveredAt`, `deliveredBy`.
  - Added indexes: `{ createdAt: -1 }` and `{ status: 1, createdAt: -1 }` for high-performance administrative sorting and filtering.
- **Admin Order List & Date Filter Logic**:
  - Date range filtering (`startDate`, `endDate`) via `parseDateFilter` helper with inclusive end-of-day parsing (`23:59:59.999Z` in UTC), format validation, and sanity checks (`endDate >= startDate`).
  - Live query support across status (`ALL`, `PENDING_PAYMENT`, `CONFIRMED`, `PREPARING`, `READY`, `DISPATCHED`, `DELIVERED`), date ranges, and text search (across `orderNumber`, `customerName`, `customerPhone`).
  - Populates linked `Payment` document (`paymentNumber`, `status`, `amount`, `submittedAt`, `verifiedAt`, `verifiedBy`, `rejectedAt`, `rejectionReason`).
  - Returns real-time aggregate counter statistics (`pendingPayment`, `confirmed`, `preparing`, `ready`, `dispatched`, `delivered`, `active`, `total`).
- **Order Details Inspection**:
  - `AdminOrderDetailsModal` displays comprehensive persisted order information:
    - Order reference, customer contact, creation timestamp.
    - Persisted item snapshots (`productId`, `name`, `unitPrice`, `quantity`, `subtotal`) ensuring historical prices are never overwritten by catalog modifications.
    - Authoritative financial totals (`subtotal`, `deliveryFee`, `totalAmount`).
    - Payment record details, verification status, verifier email, and rejection notes.
    - Delivery recipient, address, area/district, contact phone, and delivery instructions.
    - Linear, interactive lifecycle action controls with optional transition notes.
    - Interactive audit history timeline detailing actor identity, timestamp, and notes.
- **Delivery Workflow**:
  - Delivery dispatch (`READY` → `DISPATCHED`) is restricted until food is legitimately in `READY`. Sets `dispatchedAt` and `dispatchedBy`.
  - Delivery completion (`DISPATCHED` → `DELIVERED`) is restricted until food is legitimately `DISPATCHED`. Sets `deliveredAt` and `deliveredBy`.
  - Original delivery information is preserved immutably throughout fulfillment.
- **Concurrency & State Integrity**:
  - Status updates employ atomic conditional queries: `Order.findOneAndUpdate({ _id: order._id, status: currentStatus }, ...)`.
  - If two administrators attempt concurrent conflicting updates on the same order, only the first succeeds, while the second safely receives `HTTP 409 Conflict`.
- **API Endpoints Added or Enhanced**:
  - `GET /api/orders`: Admin route with `status`, `startDate`, `endDate`, and `search` query parameters.
  - `GET /api/orders/:id`: Populates payment details, delivery data, and complete status history.
  - `PATCH /api/orders/:id/status`: Admin route enforcing the centralized state machine, kitchen payment safeguards, delivery timestamp tracking, optimistic concurrency, and audit logging.
  - `GET /api/admin/overview`: Enhanced with `activeOrdersCount` statistic.
- **Automated Validation**:
  - `backend`: 62/62 automated assertions passed in `test-fs07-orders.ts` across Suites A through G.
  - `backend`: 38/38 automated assertions passed in `test-fs06-payments.ts` regression suite.
  - `backend`: 37/37 automated assertions passed in `test-fs05-checkout.ts` regression suite.
  - `backend`: TypeScript compilation (`tsc`) passed with 0 errors.
  - `frontend`: TypeScript compilation (`tsc -b && vite build`) passed with 0 errors in 993ms.
  - `frontend`: ESLint (`eslint .`) passed with 0 errors and 0 warnings.
- **Integration Notes for FS-08 (Customer Order Tracking)**:
  - FS-08 can consume `GET /api/orders/:id` and `GET /api/orders/my-orders`, which now return `statusHistory`, `paymentStatus`, `dispatchedAt`, and `deliveredAt`.
  - Customer tracking UI can map these statuses directly to customer-facing progress steppers without schema changes.

## Customer Order Tracking Decisions (FS-08)
- **Customer Ownership & Information Leakage Prevention**:
  - `GET /api/orders/:id` extracts the authenticated customer's identity (`clerkId`) directly from the verified Clerk token on the server.
  - Non-admin queries apply `{ ...identifierFilter, clerkId }` at the database level.
  - If no record matches the combined filter (i.e. the order does not exist OR belongs to another customer), the server strictly returns `HTTP 404 'Order not found'`. This prevents malicious enumeration or disclosing whether an order belongs to another customer.
  - Admins retain unrestricted access to query any order by ID without `clerkId` scoping.
- **Customer Order History & Status Distinctions**:
  - `GET /api/orders/my-orders` queries by `{ clerkId }` sorted `{ createdAt: -1 }` (newest first).
  - Delivered orders (`status === 'DELIVERED'`) are preserved and displayed in customer history; they are never filtered out simply because they are complete.
  - `CustomerOrdersPage` provides filter pills:
    - `All Orders (N)`
    - `Active Orders (N)`: Includes `PENDING_PAYMENT`, `CONFIRMED`, `PREPARING`, `READY`, `DISPATCHED`.
    - `Delivered (N)`: Includes completed deliveries.
  - Informative empty states with call-to-action ("Explore Menu & Order") when no orders match the selected filter.
- **Visual 6-Stage Progress Stepper & Friendly Labels**:
  - `OrderStatusTracker` renders an interactive visual progress timeline with 6 distinct stages:
    1. `PENDING_PAYMENT` → `Awaiting Payment`
    2. `CONFIRMED` → `Order Confirmed`
    3. `PREPARING` → `Kitchen Preparing`
    4. `READY` → `Ready for Delivery`
    5. `DISPATCHED` → `Out for Delivery`
    6. `DELIVERED` → `Delivered`
  - Real-time pulse ring animation and active indicators highlight the current stage.
  - Stage timestamps are resolved from `order.statusHistory` and dedicated fulfillment timestamps (`dispatchedAt`, `deliveredAt`).
- **Payment Status Separation & Exceptional States**:
  - Payment status remains strictly separated from order fulfillment status in both backend models and UI.
  - Payment statuses:
    - `VERIFIED`: Displays green verified banner ("Payment verified by restaurant administrator. Kitchen preparation authorized.").
    - `PENDING`: Displays blue pending notice ("Payment submitted and currently in queue for admin verification.").
    - `REJECTED`: Displays red rejection alert with the exact reason provided by the administrator (`order.paymentRejectionReason`).
  - No customer-facing mutation controls exist to alter payment status or mark payment verified.
- **Smart Refresh Strategy & Polling Safety**:
  - `CustomerOrderDetailsModal` implements an automated polling and refetching strategy:
    - Modest 10-second polling interval while viewing an active order.
    - Automatic refetch on window focus (`window.addEventListener('focus')`).
    - Smart Polling Teardown: Polling strictly ceases once an order reaches a terminal state (`DELIVERED` or payment `REJECTED`), or when the modal is closed / unmounted.
    - Manual "↻ Refresh Status" button available at any time.
- **Historical Snapshots & Financial Totals**:
  - Order details modal renders persisted snapshots: item names, images, unit prices, quantities, and subtotals.
  - Recalculation against current catalog prices is avoided.
  - Subtotal, free delivery fee, and authoritative grand total match stored DB numbers.
- **Navigation & Checkout Integration**:
  - Header updated to support `orders` tab:
    - "MY ORDERS" navigation link added for signed-in users.
    - "📋 My Orders" action button navigates directly to `CustomerOrdersPage`.
  - `CheckoutModal` confirmation step enhanced with a "🚚 Track Order Progress" CTA button which transitions the customer directly into tracking their newly submitted order.
- **Automated Validation Results**:
  - `backend`: 33/33 automated assertions passed in `test-fs08-tracking.ts` across Suites A through G.
  - `backend`: 62/62 automated assertions passed in `test-fs07-orders.ts` regression suite.
  - `backend`: 38/38 automated assertions passed in `test-fs06-payments.ts` regression suite.
  - `backend`: 37/37 automated assertions passed in `test-fs05-checkout.ts` regression suite.
  - Total automated backend tests passed: **170 / 170 (100% pass rate)**.
  - `backend`: TypeScript compilation (`tsc`) passed with 0 errors.
  - `frontend`: TypeScript compilation (`tsc -b && vite build`) passed with 0 errors in 1.48s.
  - `frontend`: ESLint (`eslint .`) passed with 0 errors and 0 warnings.

## Admin Management Decisions (FS-09)
- **Unified 10-Area Protected Admin Workspace**:
  - Implemented a coherent, protected single-workspace Admin experience unifying all 10 restaurant management areas:
    1. **Dashboard**: High-level operational command center showing authoritative live KPIs (orders count, verified revenue, active preparation queue, courier dispatch queue, pending payment claims, pending feedback), quick-action alerts, and recent orders/payments/feedback tables.
    2. **Products**: Complete catalog management reused from FS-02 with search, category filtering, product creation, pricing updates, availability toggling, and image preview.
    3. **Categories**: Category management reused from FS-02 with linked product deletion safeguards and creation modals.
    4. **Orders**: Full order management reused from FS-07 with date range filtering, search by order number / customer / phone, order details modal, and strictly enforced status machine transitions.
    5. **Payments**: Manual payment verification queue reused from FS-06 with side-by-side transaction inspection, double-confirmation verify modal, rejection modal with mandatory reason, and full audit trails.
    6. **Customers**: Persisted customer directory aggregating registered Clerk/MongoDB accounts and customer orders. Displays order counts, verified lifetime spend, phone/email context, search filter, and customer profile inspection modal with full order history.
    7. **Delivery**: Dedicated fulfillment tracking view separating orders by delivery stage (`READY`, `DISPATCHED`, `DELIVERED`). Displays courier address, district, phone, and delivery instructions. Provides one-click action modals for dispatching and marking delivered while strictly enforcing the underlying FS-07 status machine (`READY` -> `DISPATCHED` -> `DELIVERED`).
    8. **Reports**: Authoritative operational and sales analytics with date range filtering (`startDate`, `endDate`), status distribution breakdown with percentage shares, payment verification breakdown, top products performance (units sold and verified revenue), and delivery fulfillment metrics.
    9. **Feedback**: Persisted customer inquiry inbox displaying contact inquiries submitted via the public contact endpoint. Includes message preview modal, submission timestamps, reviewer identity stamps, and review status workflow (`PENDING` -> `REVIEWED` / `ARCHIVED`).
    10. **Settings**: Persisted restaurant operational configuration view managing display name, hotline, kitchen email, operating hours, operational status (`OPEN`, `CLOSED`, `BUSY`), delivery notice, and delivery active toggle with client-side validation and confirmation modal.
- **Server-Side Authorization & Role Security**:
  - All 10 administrative operations and APIs are strictly protected behind server-side `requireRole(['admin'])` middleware in [backend/src/routes/admin.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/admin.routes.ts).
  - Unauthenticated requests are rejected with `HTTP 401 Unauthorized`.
  - Authenticated customer accounts cannot access admin endpoints (`HTTP 403 Forbidden`).
  - No client-supplied roles or frontend claims are trusted.
- **Financial Truth Invariants**:
  - Across the Dashboard (`GET /api/admin/overview`) and Reports (`GET /api/admin/reports`), revenue figures are strictly calculated from orders with `{ paymentStatus: 'VERIFIED' }`.
  - Customer payment claims with status `PENDING` are tracked separately as `pendingPaymentsAmount` and are never counted as received revenue.
  - Rejected payments are completely excluded from revenue calculations.
- **Data Persistence & Schemas**:
  - [backend/src/models/Feedback.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/models/Feedback.ts): Persists customer feedback with `name`, `email`, `phone`, `subject`, `message`, `status` (`'PENDING' | 'REVIEWED' | 'ARCHIVED'`), `reviewedBy`, and `reviewedAt`.
  - [backend/src/models/RestaurantSettings.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/models/RestaurantSettings.ts): Singleton schema storing operational settings (`restaurantName`, `contactPhone`, `contactEmail`, `operatingHours`, `restaurantStatus`, `deliveryNotice`, `isDeliveryActive`, `updatedBy`).
  - Public endpoints: `POST /api/feedback` and `GET /api/settings` mounted in [backend/src/routes/feedback.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/feedback.routes.ts).
- **Navigation & Usability**:
  - Responsive horizontal tab navigation bar with live operational queue counter badges (`AdminTabNav`).
  - "← Return to Storefront" action button allows seamless return to customer storefront without full-page reloads.
  - Complete light/dark theme support with CSS variables across all tables, KPI cards, and modals.
- **Automated Validation Results**:
  - `backend`: 58/58 automated assertions passed in `test-fs09-admin.ts` across Suites A through H.
  - `backend`: 33/33 automated assertions passed in `test-fs08-tracking.ts` regression suite.
  - `backend`: 62/62 automated assertions passed in `test-fs07-orders.ts` regression suite.
  - `backend`: 38/38 automated assertions passed in `test-fs06-payments.ts` regression suite.
  - `backend`: 37/37 automated assertions passed in `test-fs05-checkout.ts` regression suite.
  - Total automated backend tests passed: **228 / 228 (100% pass rate)**.
  - `backend`: TypeScript compilation (`tsc`) passed with 0 errors.
  - `frontend`: TypeScript compilation (`tsc -b && vite build`) passed with 0 errors in 892ms.
  - `frontend`: ESLint (`eslint .`) passed with 0 errors and 0 warnings.
  - Database verified clean: 0 leftover test records in MongoDB.

## Reports & Exports Decisions (FS-10)
- **Comprehensive 4-Report Architecture**:
  - Implemented 4 dedicated business reports and an operational overview integrated into the Admin Management workspace:
    1. **Product Report**: Complete menu catalog reporting product name, price, quantity, category, and status.
       - *Quantity Limitation Decision*: Because BiteFlow is a restaurant ordering application where all dishes are freshly prepared to order upon receipt of a confirmed purchase, physical warehouse inventory stock is not tracked. To prevent misleading or fabricated metrics, the Quantity column is accurately and explicitly labeled as `"N/A (Made to order)"` with an informational notice. In addition, historical verified units sold and revenue generated are displayed to provide meaningful operational demand context.
       - *Category Population & Resilience*: Uses Mongoose `.populate('category', 'name')` and safely falls back to `"Uncategorized"` if a category document was removed or missing.
       - *Filtering*: Search by product name, category selection, and availability state (`ALL`, `AVAILABLE`, `UNAVAILABLE`).
       - *Exports*: Supports safe **CSV** and branded printable **PDF**.
    2. **Selling Report**: Sales performance and revenue recognition over a selected date range.
       - *Date Filtering*: Backend-validated start and end date parameters (`parseDateFilter`) with inclusive end-of-day parsing (`23:59:59.999Z` UTC) and rejection of reversed or malformed ranges.
       - *Financial Invariant & Revenue Definition*: Revenue is strictly calculated server-side from orders with `{ paymentStatus: 'VERIFIED' }`. Orders with `PENDING` or `REJECTED` payments are excluded from recognized revenue.
       - *Historical Price Integrity*: Product revenue and average prices are computed exclusively from historical snapshot fields (`item.unitPrice`, `item.quantity`, `item.subtotal`) in the Order document; current catalog price modifications never mutate or alter historical revenue truth.
       - *Exports*: Supports **CSV** and branded printable **PDF**.
    3. **Order Report**: Detailed orders report displaying order reference, creation date, customer name, items count, total amount, order status, payment status, and derived delivery status.
       - *Delivery Status Derivation*: Fulfillment delivery status is derived consistently from the established order lifecycle:
         - `DELIVERED` → 'Delivered'
         - `DISPATCHED` → 'Out for Delivery'
         - `READY` → 'Ready for Dispatch'
         - `PREPARING` → 'In Kitchen Prep'
         - `CONFIRMED` → 'Pending Kitchen'
         - `PENDING_PAYMENT` → 'Awaiting Verification'
       - *Complete Dataset Export*: PDF export exports the complete filtered dataset matching active criteria (multi-page printable layout) without silent pagination truncation.
    4. **Contact / Feedback Report**: Persisted customer inquiries from MongoDB displaying customer name, email, phone, subject, original message, status (`PENDING`, `REVIEWED`, `ARCHIVED`), submission date, and reviewer attribution.
       - *Filtering*: Start date, end date, and review status.
       - *Exports*: Supports **CSV** export.
- **Server-Side Authorization & Security**:
  - All report routes (`/api/admin/reports/products`, `/api/admin/reports/selling`, `/api/admin/reports/orders`, `/api/admin/reports/feedback`, `/api/admin/reports`) are mounted on `adminRouter` and strictly protected with `requireRole(['admin'])`.
  - Unauthenticated requests receive `HTTP 401 Unauthorized`.
  - Authenticated customer accounts receive `HTTP 403 Forbidden`.
- **Export Safety & Formula Injection Protection**:
  - `exportUtils.ts` enforces RFC-4180 CSV compliance:
    - Prepends UTF-8 BOM (`\uFEFF`) for seamless character rendering in Microsoft Excel and Google Sheets.
    - Double quotes cells containing commas, quotes, or newlines, and doubles internal quotes (`""`).
    - **Formula Injection Guard**: Automatically neutralizes cells beginning with dangerous characters (`=`, `+`, `-`, `@`, `\t`, `\r` even after leading whitespace or ASCII control characters) by prefixing with a single quote (`'`), preventing DDE / formula execution in spreadsheet software.
  - Branded printable PDF generation via clean off-screen iframe document using CSS `@media print`, `@page { margin: 14mm 12mm; }`, page-break rules, header branding, metadata summary strip, and summary KPI cards.
- **Backend APIs Added**:
  - `GET /api/admin/reports/products`: Returns products with populated category, status, units sold, and revenue.
  - `GET /api/admin/reports/selling`: Returns date-filtered products sold, item counts, qualifying orders, and verified revenue.
  - `GET /api/admin/reports/orders`: Returns date-filtered and status-filtered orders with derived delivery status and summaries.
  - `GET /api/admin/reports/feedback`: Returns date-filtered and status-filtered feedback records.
- **Automated Validation Results**:
  - `backend`: 68/68 automated assertions passed in `test-fs10-reports.ts` across Suites A through G.
  - `backend`: 58/58 automated assertions passed in `test-fs09-admin.ts` regression suite.
  - `backend`: 33/33 automated assertions passed in `test-fs08-tracking.ts` regression suite.
  - `backend`: 62/62 automated assertions passed in `test-fs07-orders.ts` regression suite.
  - `backend`: 38/38 automated assertions passed in `test-fs06-payments.ts` regression suite.
  - `backend`: 37/37 automated assertions passed in `test-fs05-checkout.ts` regression suite.
  - Total automated backend tests passed: **296 / 296 (100% pass rate)**.
  - `backend`: TypeScript compilation (`tsc`) passed with 0 errors.
  - `frontend`: TypeScript compilation (`tsc -b && vite build`) passed with 0 errors in 1.02s.
  - `frontend`: ESLint (`eslint .`) passed with 0 errors and 0 warnings.
- **UI Vector Icon Modernization & Database Integrity**:
  - Replaced all raw browser and AI emojis (`🛒`, `📈`, `📋`, `💬`, `📊`, `📄`, `🖨️`, `📞`, `🚚`, `📅`, `🛡️`, `⚠️`, `✅`) across report subtabs, export buttons, informational callouts, header navigation, and customer phone rows with standard Lucide vector SVG icons (`ShoppingCartIcon`, `TrendingUpIcon`, `ClipboardListIcon`, `MessageSquareIcon`, `BarChart3Icon`, `FileSpreadsheetIcon`, `PrinterIcon`, `PhoneIcon`, `DeliveryIcon`, `ClockIcon`, `ShieldCheckIcon`, `AlertTriangleIcon`, `CheckCircleIcon`, `Store` restaurant storefront `DashboardIcon`).
  - Fixed report subtab button styling inversion so active tabs render with solid primary brand teal (`#0d9488`) and inactive tabs render as clean neutral card buttons.
- **Legacy Payment Record Backfill Migration (One-Time Execution)**:
  - Addressed historical data inconsistency where three legacy orders created during FS-05 (`ORD-084035-8831` $6.00, `ORD-740093-2125` $5.00, and `ORD-959272-7692` $3.00) lacked linked `Payment` documents.
  - Implemented and executed safe, idempotent script [backend/src/scripts/backfill-legacy-payments.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/scripts/backfill-legacy-payments.ts):
    - Re-checked each target order atomically prior to write.
    - Created 3 missing `PENDING` USD payment records with authoritative totals (`PAY-802529-5329`, `PAY-802548-5012`, `PAY-802562-9884`).
    - Linked `order.paymentId` to newly created payment records without altering order statuses.
    - Preserved existing payments and orders untouched.
    - Confirmed final payment counts in MongoDB: 7 total (4 Pending Verification, 3 Verified, 0 Rejected).
    - Verified all regression test suites passing (259/259 tests).

## Contact & Feedback Decisions (FS-11)
- **Customer Contact Experience & Identity Architecture**:
  - Implemented dedicated, accessible customer Contact & Feedback page [frontend/src/pages/ContactPage.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/pages/ContactPage.tsx) mounted at the `CONTACT` navigation tab in `Header.tsx` and `App.tsx`.
  - **Restaurant Operational Info**: Displays live direct lines (delivery hotline, kitchen email, daily service hours, and cloud delivery-only kitchen badge) with Lucide vector icons (`PhoneIcon`, `MailIcon`, `ClockIcon`, `DeliveryIcon`).
  - **Dual Identity Handling**:
    - *Authenticated Customers*: When logged in with Clerk, displays a verified account banner (`✓ Verified`) and automatically pre-fills customer name and email while leaving them customizable. Links verified `clerkId` on the backend.
    - *Guest Diners*: Guests are completely free to submit questions and catering requests without being forced to create an account or sign in.
  - **Structured Category Presets**: Provides 7 restaurant inquiry categories (`General Inquiry`, `Order Question & Support`, `Food Quality & Taste`, `Delivery Experience`, `Catering & Private Events`, `Suggestions & Compliments`, `Other`) with automatic subject pre-fill.
  - **Form Safety & UX**:
    - Accessible semantic labels and `aria-invalid` / `aria-describedby` attributes.
    - Real-time character counter (`min 5, max 2000`).
    - Input preservation on network or validation errors.
    - Submit button disabled while submitting (`isSubmitting`) to prevent accidental duplicate clicks.
    - Confirmed success state displaying server reference ID (`#XXXXXX`), email follow-up notification, and quick action buttons (`Send Another Message`, `Explore Menu & Order`).
    - Zero browser `alert()` usage. Full dark/light theme support.
- **Backend Data Model & Persistence**:
  - [backend/src/models/Feedback.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/models/Feedback.ts): Mongoose schema storing `name`, `email`, `phone`, `subject`, `message`, `status` (`'PENDING' | 'REVIEWED' | 'ARCHIVED'`), indexed `clerkId`, `reviewedBy`, `reviewedAt`, and timestamps.
  - Initial status is strictly assigned to `'PENDING'` on the backend. Client-supplied status, reviewer identities, or timestamps in public submission payloads are stripped and ignored.
  - Public submission endpoint `POST /api/feedback` in [backend/src/routes/feedback.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/feedback.routes.ts) validates input with Zod (`createFeedbackSchema`), strips whitespace, enforces limits, resolves optional Clerk authentication via `resolveClerkAuth`, and returns HTTP 201 with `feedbackId`.
  - Built-in lightweight in-memory sliding rate limiter (maximum 10 submissions per 10 minutes per IP address) for abuse prevention.
- **Admin Management & Controlled Review Workflow**:
  - Integrated into the unified FS-09 Admin Workspace (`AdminFeedbackTable.tsx`).
  - **Filtering & Search**: Status subtabs (`All Messages`, `Pending Review`, `Reviewed`, `Archived`) with live count badges, combined with a real-time search box filtering across customer name, email, phone, subject, and message body.
  - **Message Inspection Modal**: Allows reading full message text with `whiteSpace: 'pre-wrap'` formatting without distorting table rows.
  - **Status Management**:
    - Protected admin endpoints: `GET /api/admin/feedback` and `PATCH /api/admin/feedback/:id/status` protected by `requireRole(['admin'])`.
    - Unauthenticated requests receive HTTP 401; customer accounts receive HTTP 403.
    - Status transitions (`PENDING` -> `REVIEWED` / `ARCHIVED` / `PENDING`) update `status`, record reviewer email (`reviewedBy`), and stamp `reviewedAt` while leaving original customer message, subject, name, email, and submission date immutable.
- **Reports & Exports Integration (FS-10)**:
  - Persisted feedback documents are integrated into the FS-10 Contact / Feedback Report via `GET /api/admin/reports/feedback`.
  - Displays latest review status, customer name, email, phone, subject, message preview, submission date, and reviewer stamps.
  - Supports RFC-4180 compliant CSV export with formula injection defense (`sanitizeCSVCell` neutralizes `=`, `+`, `-`, `@` characters) and UTF-8 BOM.
- **Automated Validation Results**:
  - `backend`: 50/50 automated assertions passed in `test-fs11-feedback.ts` across Suites A through D.
  - `backend`: 68/68 automated assertions passed in `test-fs10-reports.ts` regression suite.
  - `backend`: 58/58 automated assertions passed in `test-fs09-admin.ts` regression suite.
  - `backend`: 33/33 automated assertions passed in `test-fs08-tracking.ts` regression suite.
  - `backend`: 62/62 automated assertions passed in `test-fs07-orders.ts` regression suite.
  - `backend`: 38/38 automated assertions passed in `test-fs06-payments.ts` regression suite.
  - `backend`: 37/37 automated assertions passed in `test-fs05-checkout.ts` regression suite.
  - Total automated backend tests passed: **346 / 346 (100% pass rate)**.
  - `backend`: TypeScript compilation (`tsc`) passed with 0 errors.
  - `frontend`: TypeScript compilation (`tsc -b && vite build`) passed with 0 errors in 1.12s.
  - `frontend`: ESLint (`eslint .`) passed with 0 errors and 0 warnings.
  - Database verified clean: 0 leftover test records in MongoDB.

## Settings & System Integration Decisions (FS-12)
- **Status**: COMPLETED.
- **Restaurant Operational Settings Model & Persistence**:
  - [backend/src/models/RestaurantSettings.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/models/RestaurantSettings.ts): Mongoose singleton document storing `restaurantName`, `contactPhone`, `contactEmail`, `operatingHours`, `restaurantStatus` (`'OPEN' | 'CLOSED' | 'BUSY'`), `isDeliveryActive`, `deliveryNotice`, `currency` (`'USD'`), `serviceArea`, `updatedBy`, and timestamps.
  - Initialized safely and idempotently on boot via `seedInitialSettings()` in [backend/src/config/seed.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/config/seed.ts). Guarantees default configuration exists without overwriting existing administrator updates on server restarts. Zero manual database modifications required.
- **Settings API & Server-Side Authorization**:
  - `GET /api/settings`: Public endpoint in [backend/src/routes/settings.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/settings.routes.ts) accessible without authentication. Returns strictly sanitized public-facing properties (`restaurantName`, `contactPhone`, `contactEmail`, `operatingHours`, `restaurantStatus`, `deliveryNotice`, `isDeliveryActive`, `currency`). Strips MongoDB `_id`, credentials, and server internals.
  - `GET /api/admin/settings` & `PATCH /api/admin/settings`: Protected administrative endpoints in [backend/src/routes/admin.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/admin.routes.ts) guarded by `requireRole(['admin'])`. Unauthenticated requests receive HTTP 401; customers receive HTTP 403 Forbidden.
  - Validation: Validates incoming payloads via `updateSettingsSchema` with Zod, rejects invalid enum states (HTTP 400), supports partial updates (standard PATCH semantics), and records the authenticated admin actor ID/email in `updatedBy`.
- **Operational Enforcement & Kitchen Availability**:
  - Backend enforcement in `POST /api/orders` ([backend/src/routes/order.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/order.routes.ts)):
    - If `restaurantStatus === 'CLOSED'`, order submission is rejected with HTTP 400 Bad Request ("Restaurant is currently closed and not accepting new orders").
    - If `isDeliveryActive === false`, order submission is rejected with HTTP 400 Bad Request ("Delivery service is currently inactive. Please check back later.").
  - Frontend visual alerts & button controls:
    - [frontend/src/components/cart/CheckoutModal.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/cart/CheckoutModal.tsx): Displays an alert banner and disables submission buttons when closed or delivery is paused.
    - [frontend/src/components/layout/Header.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/layout/Header.tsx): Displays operational status badge pills in navigation (`🔴 Closed`, `🟡 High Volume / Busy`).
    - [frontend/src/components/layout/Footer.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/layout/Footer.tsx) and [frontend/src/pages/ContactPage.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/pages/ContactPage.tsx): Dynamically display persisted restaurant phone, email, and daily operating hours.
    - Settings updates in `AdminSettingsView.tsx` trigger `onSettingsUpdated`, propagating state to all components across the app in real time.
- **Idempotent Order Creation Guard**:
  - Implemented 15-second rapid checkout retry protection guard in `POST /api/orders`.
  - Consecutive duplicate checkout attempts (matching customer, delivery address, items, and status within 15 seconds) return the existing order with HTTP 200, preventing duplicate orders and duplicate payment documents upon network retries or accidental double clicks.
- **System Diagnostics & Health Check**:
  - Enhanced `/api/health` endpoint in [backend/src/server.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/server.ts).
  - Inspects `mongoose.connection.readyState`: returns HTTP 200 `{ status: "ok", service: "BiteFlow API", database: "connected", timestamp }` when healthy; returns HTTP 503 if database disconnected.
  - Zero sensitive database URLs, credentials, or internal stack traces exposed.
- **Production Secrets & Environment Safety**:
  - Removed server-only `CLERK_SECRET_KEY` from [frontend/.env.local](file:///c:/Users/HP/Desktop/BiteFlow/frontend/.env.local).
  - Created [frontend/.env.example](file:///c:/Users/HP/Desktop/BiteFlow/frontend/.env.example) containing only public client variables (`VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`).
  - Created [backend/src/config/env.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/config/env.ts) validating required backend environment variables on startup (`PORT`, `MONGODB_URI`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`).
  - Masked MongoDB credentials in connection logger output in [backend/src/config/db.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/config/db.ts).
- **Theme & Branding Consistency**:
  - Standardized form input contrast in [frontend/src/components/admin/AdminSettingsView.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/admin/AdminSettingsView.tsx) using `.form-input` classes to guarantee legible text and borders in both light and dark modes.
  - Preserved official `/Bitelogo.png` wordmark logo and Lucide vector icons across customer and admin views.
- **End-to-End Workflow Verification**:
  - Executed automated integration test script [backend/src/scripts/test-fs12-system-integration.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/scripts/test-fs12-system-integration.ts) proving the complete restaurant lifecycle without manual database edits:
    1. Customer authentication & role resolution.
    2. Menu item selection & authoritative server price review.
    3. Order creation & initial pending payment generation.
    4. Operational rule enforcement (closed & paused delivery rejections).
    5. Rapid duplicate submission protection.
    6. Customer tracking & isolation.
    7. Customer prevented from self-verifying payment or altering order status.
    8. Admin payment queue inspection & manual payment verification.
    9. Atomic transition of order to `CONFIRMED`.
    10. Complete kitchen preparation lifecycle: `CONFIRMED` -> `PREPARING` -> `READY` -> `DISPATCHED` -> `DELIVERED`.
    11. Invalid status jumps & regressions rejected by state machine.
    12. Delivered order accessible in customer history.
    13. Delivered order reflected in administrative sales and order reports.
    14. 100% self-cleanup of test records.
- **Test Results**:
  - `backend`: 45/45 automated assertions passed in `test-fs12-system-integration.ts`.
  - `backend`: 50/50 automated assertions passed in `test-fs11-feedback.ts` regression suite.
  - `backend`: 68/68 automated assertions passed in `test-fs10-reports.ts` regression suite.
  - `backend`: 58/58 automated assertions passed in `test-fs09-admin.ts` regression suite.
  - `backend`: 33/33 automated assertions passed in `test-fs08-tracking.ts` regression suite.
  - `backend`: 62/62 automated assertions passed in `test-fs07-orders.ts` regression suite.
  - `backend`: 38/38 automated assertions passed in `test-fs06-payments.ts` regression suite.
  - `backend`: 37/37 automated assertions passed in `test-fs05-checkout.ts` regression suite.
  - Total automated backend tests passed: **391 / 391 (100% pass rate)**.
  - `backend`: TypeScript compilation (`tsc`) passed with 0 errors.
  - `frontend`: TypeScript compilation (`tsc -b && vite build`) passed with 0 errors in 1.14s.
  - `frontend`: ESLint (`eslint .`) passed with 0 errors and 0 warnings.
- **UI Vector Icon Modernization**:
  - Replaced all remaining raw browser emojis (`📞`, `✉️`, `⏰`, `💾`, `🔴`, `🟡`, `❌`, `✅`, `⏳`) in [frontend/src/components/layout/Footer.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/layout/Footer.tsx), [frontend/src/components/admin/AdminSettingsView.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/admin/AdminSettingsView.tsx), [frontend/src/components/layout/Header.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/layout/Header.tsx), and [frontend/src/components/orders/OrderStatusTracker.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/orders/OrderStatusTracker.tsx) with standard Lucide vector SVG icons (`PhoneIcon`, `MailIcon`, `ClockIcon`, `SaveIcon`, `CheckCircleIcon`, `AlertTriangleIcon`, and sleek CSS status dots), preserving dark/light theme contrast and brand aesthetics.





