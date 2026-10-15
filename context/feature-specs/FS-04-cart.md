# FS-04 — Cart

## Goal
Allow customers to build and review an order before checkout.

## Requirements
- Customer can add available products to cart.
- Customer can increase/decrease quantity.
- Customer can remove items.
- Customer can see subtotal and order total.
- Persistent cart drawer is available from the storefront.
- Empty cart has a clear empty state.
- Cart updates are reflected immediately.
- Customer can continue shopping from the cart.

## Business Rule
Cart changes are allowed before payment/order submission.

## Acceptance Criteria
- Add, update, and remove operations work.
- Quantities cannot become invalid.
- Totals are calculated correctly.
- Unavailable products cannot be newly added.
- Cart behaves correctly after page navigation/refresh according to the chosen persistence design.
