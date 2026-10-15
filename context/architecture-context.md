# BiteFlow Architecture Context

## Goal
Keep the application simple, maintainable and production-oriented.

## Layers
- UI: React App Router, React, Tailwind, shadcn/ui
- Server: Next.js server-side code and route/server-action boundaries
- Data: mongodb + mongoose
- Validation: server-boundary schemas
- Authorization: server-side for admin operations

## Core domains
Authentication, Customers, Categories, Products, Cart, Orders, Payments, Delivery, Reports, Contact/Feedback, Settings.

## State separation
Payment: PENDING, VERIFIED, REJECTED.
Order: PENDING_PAYMENT, CONFIRMED, PREPARING, READY, DISPATCHED, DELIVERED.
Payment verification is required before preparation.

## Decisions
Single restaurant. Delivery only. Admin handles kitchen in V1. Customer accounts required. No customer cancellation after purchase/submission. Payment provider not selected yet; manual verification is initial.

Prefer the smallest change that solves a requirement. Do not introduce infrastructure just because another project uses it.
