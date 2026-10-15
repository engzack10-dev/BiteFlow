# BiteFlow AI Engineering Rules

## Mission
BiteFlow is a production-oriented restaurant ordering and management application. AI must work as an engineering assistant, not as an autonomous product designer.

## Source of truth
Before changing code, read the relevant files in context/. Do not invent requirements that are not documented.

## Workflow
1. Understand the requested change.
2. Read relevant context and existing code.
3. Identify affected files and dependencies.

4. Plan the smallest safe implementation.
5. Implement only the requested scope.
6. Run validation/tests.
7. Check the result against evaluation criteria.
8. Update documentation/progress when decisions or behavior change.

## Prompt framework
ROLE → TASK → FORMAT → CONTEXT → CONSTRAINTS → EVALUATION

## Coding rules
- Next.js + TypeScript.
- Neon PostgreSQL + Prisma.
- Follow existing architecture.
- Reuse existing components/utilities.
- Do not change unrelated features.
- Do not add dependencies without a reason.
- Never treat an unverified payment as a paid order.
- Keep payment status separate from order status.
- Protect admin operations server-side.
- Preserve light/dark theme support.
- Do not use browser-native alert() for product UI.

## Before finishing
Report what changed, files changed, validation performed, and remaining risks/decisions.
If requirements conflict, ask for clarification instead of guessing.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
