# FS-05 — Checkout & Delivery

## Goal
Collect the information required to place a delivery order.

## Requirements
- Only authenticated customers can checkout.
- Checkout displays the selected items and trusted server-side totals.
- Customer provides required delivery/contact information.
- Customer reviews the order before submitting payment.
- Invalid or incomplete delivery data is rejected.
- Customer clearly sees the final amount before payment.

## Business Rules
- BiteFlow is delivery only.
- Purchased/submitted orders cannot be cancelled.
- Cart can still be changed before order/payment submission.

## Acceptance Criteria
- Valid checkout can proceed to payment.
- Invalid delivery information is rejected.
- Final amount matches trusted server-side order data.
- Customer receives clear confirmation that payment verification is pending.
