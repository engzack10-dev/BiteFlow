# BiteFlow Engineering Standards

## TypeScript
Strict typing. Avoid any unless documented. Explicit domain types. Small focused functions.

## Next.js
Server Components by default. Client Components only for required interactivity. Keep database access server-side.

## Database
mongodb is the source of business data. Use Mongoose. Explicit relationships. Transactions for atomic multi-step operations. Never trust client financial totals.

## Security
Validate server inputs. Authorize admin operations server-side. Never trust client payment status. Never expose secrets.

## Business logic
Keep order, payment and delivery states explicit. Store important state-change timestamps. Calculate financial truth server-side.

## UI
Reuse shared components, follow design tokens, support keyboard/mobile, never use alert().

## Testing
For important logic test happy path, invalid input, unauthorized access, state transitions and edge cases.

## Change discipline
Keep changes focused. Do not mix unrelated refactors with feature work.
