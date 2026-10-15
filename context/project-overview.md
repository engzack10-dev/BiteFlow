# BiteFlow Project Overview

BiteFlow is a full-stack restaurant ordering and management web application.

## Business
- One restaurant
- Delivery only
- Customers create accounts
- Admin manages the restaurant
- No separate kitchen role in V1

## Customer
Register/login, browse menu, view food, manage cart, checkout, pay, wait for admin verification, track order, receive delivery.

## Admin
Manage products/categories/prices/availability, customers, payments, orders, kitchen/delivery status, reports, restaurant settings, and contact/feedback.

## Main flow
Customer → Menu → Food → Cart → Checkout → Payment → Admin Verification → Confirmed → Preparing → Ready → Dispatched → Delivered

## Cancellation
Cart can change before payment/order submission. Purchased/submitted orders cannot be cancelled.

## Reports
Product: name, price, quantity, category, status; CSV/PDF.
Selling: date range, items sold, total item count, total revenue.
Orders: orders, date, status, payment status, delivery status; PDF.
Contact/feedback: customer, message, date, status.

## Technology
Next.js, TypeScript, Neon PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, light/dark mode.

## Brand
Premium, elegant, warm and food-focused. Wordmark logo. Warm food tones.
