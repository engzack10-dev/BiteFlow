# FS-07 — Order Management

## Goal
Give the admin a complete operational order workflow.

## Order Status
- PENDING_PAYMENT
- CONFIRMED
- PREPARING
- READY
- DISPATCHED
- DELIVERED

## Requirements
- Admin can view all orders.
- Admin can filter orders by date.
- Admin can inspect order details.
- Admin can update allowed order statuses.
- Order status changes are recorded.
- Kitchen preparation starts only after payment verification.
- Delivery workflow starts after the order is ready.

## Acceptance Criteria
- Orders appear in the correct state.
- Invalid state transitions are prevented.
- Admin can manage the complete lifecycle.
- Order information remains consistent with payment and delivery data.
