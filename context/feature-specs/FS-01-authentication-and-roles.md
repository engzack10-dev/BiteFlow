# FS-01 — Authentication & Roles

## Goal
Provide secure customer accounts and protected admin access using Clerk.

## Users
- Customer
- Admin

## Requirements
- Customer can sign up, sign in, sign out, and manage their authenticated session.
- Customer account is required to place an order.
- Admin must authenticate before accessing admin features.
- Application authorization must distinguish customer and admin permissions.
- Customer can access only their own account/order data.
- Admin can access restaurant management functions.
- Unauthorized users cannot access protected server operations.

## Acceptance Criteria
- Customer can authenticate successfully.
- Admin can authenticate successfully.
- Protected routes reject unauthenticated access.
- Customer cannot perform admin actions.
- Admin actions are authorized server-side.
- Authentication failures do not expose sensitive information.

## Constraints
- Use Clerk.
- Do not rely only on hidden UI buttons for authorization.
