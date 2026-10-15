# FS-10 — Reports & Exports

## Goal
Give the admin accurate operational and sales reporting.

## Product Report
Fields:
- Product name
- Price
- Quantity
- Category
- Status

Export:
- CSV
- PDF

## Selling Report
- Date range filter
- Products sold
- Total item count
- Total revenue

## Order Report
- Orders
- Date
- Status
- Payment status
- Delivery status
- Date filtering

Export:
- PDF

## Contact/Feedback Report
- Customer
- Message
- Date
- Status

## Rules
- Reports use trusted database data.
- Financial values are calculated server-side.
- Filters must be applied consistently.
- Exports must match the currently selected report data.

## Acceptance Criteria
- Report totals match underlying verified order/payment data.
- Date filters work correctly.
- Exports contain the displayed report data.
