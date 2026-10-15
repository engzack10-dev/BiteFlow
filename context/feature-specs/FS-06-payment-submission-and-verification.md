# FS-06 — Payment Submission & Verification

## Goal
Support the initial manual payment verification workflow until a payment API is available.

## Flow
Customer submits payment → order becomes PENDING_PAYMENT → admin checks the actual money transaction notification/account → admin verifies or rejects payment.

## Requirements
- Customer can submit the payment step.
- Payment record is created with PENDING status.
- Order cannot enter kitchen preparation while payment is pending.
- Admin can view pending payments.
- Admin can verify a payment.
- Admin can reject a payment.
- Verification records who performed the action and when.
- Payment status is separate from order status.

## Payment Status
- PENDING
- VERIFIED
- REJECTED

## Business Rules
- Client-side claims never prove payment.
- Only verified payment can confirm an order.
- Do not integrate a payment API in V1 unless separately approved.

## Acceptance Criteria
- Pending payment appears to admin.
- Verified payment changes the order to CONFIRMED.
- Rejected payment does not start preparation.
- Payment history is auditable.
