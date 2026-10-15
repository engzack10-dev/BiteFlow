# FS-11 — Contact & Feedback

## Status
Completed (Verified with 50 automated tests in `test-fs11-feedback.ts`)

## Goal
Allow customers to send questions or feedback and allow the admin to manage them.

## Requirements
- Customer can submit a message/feedback.
- Submission validates required information.
- Admin can view messages.
- Admin can track message status (`PENDING` -> `REVIEWED` / `ARCHIVED`).
- Admin can download feedback report data.
- Customer should receive clear submission feedback.

## Acceptance Criteria
- Valid feedback is stored in MongoDB.
- Invalid submissions are rejected with clear error messages.
- Admin can filter/view feedback with real-time search.
- Feedback data is included in the relevant report and CSV export.

## Implemented Components
- **Customer Page**: [frontend/src/pages/ContactPage.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/pages/ContactPage.tsx)
- **Backend API**: [backend/src/routes/feedback.routes.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/routes/feedback.routes.ts) (`POST /api/feedback`)
- **Admin Management**: [frontend/src/components/admin/AdminFeedbackTable.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/admin/AdminFeedbackTable.tsx) (`GET /api/admin/feedback`, `PATCH /api/admin/feedback/:id/status`)
- **Report & Export**: [frontend/src/components/admin/AdminReportsView.tsx](file:///c:/Users/HP/Desktop/BiteFlow/frontend/src/components/admin/AdminReportsView.tsx) (`GET /api/admin/reports/feedback`, `exportToCSV`)
- **Automated Tests**: [backend/src/scripts/test-fs11-feedback.ts](file:///c:/Users/HP/Desktop/BiteFlow/backend/src/scripts/test-fs11-feedback.ts)

