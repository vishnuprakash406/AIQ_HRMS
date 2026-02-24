# AIQ HRMS (small-scale, cost-efficient)

Lightweight HRMS starter focused on low-cost deployment and clear module boundaries. Stack: Node.js + Express + PostgreSQL; React/Vite frontend to be added next.

## Structure
- backend/: Express API skeleton with modules for auth, attendance, leave, inventory, payroll, documents, onboarding, and support.
- backend/docs/initial_schema.sql: starter tables for core flows.
- frontend/: reserved for Vite React app (not scaffolded yet).

## Getting started (backend)
1) Copy env: `cp backend/.env.example backend/.env` and fill `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
2) Install deps: `cd backend && npm install`.
3) Create DB and run schema: `psql $DATABASE_URL -f docs/initial_schema.sql`.
4) Start API: `npm run dev` (nodemon) or `npm start`.
5) Health check: `GET /health`.

## Getting started (frontend)
1) `cd frontend && npm install`.
2) `npm run dev` (Vite dev server on 5173 with proxy to backend 3000).
3) Open http://localhost:5173.

## Key endpoints (v1)
- `POST /api/v1/auth/request-otp` → send OTP (console log placeholder) for username/phone.
- `POST /api/v1/auth/verify-otp` → exchange OTP for access/refresh tokens.
- `POST /api/v1/auth/login-password` → username (email/phone) + password; if password expired, OTP is sent and request is rejected with `code: PASSWORD_EXPIRED`.
- `POST /api/v1/auth/reset-password-otp` → username + OTP + newPassword to reset expired password.
- `POST /api/v1/auth/admin-login` → stub admin login (email `admin@example.com` / password `admin123`); replace with DB lookup.
- `POST /api/v1/auth/refresh` → rotate tokens.
- `POST /api/v1/attendance/check-in|check-out|corrections` → stub flows.
- `POST /api/v1/leave/apply`, `GET /api/v1/leave/balance`, `POST /api/v1/leave/:id/decision`.
- `GET/POST /api/v1/inventory` and `/api/v1/inventory/:id/allocate` (admin gated).
- `GET /api/v1/payroll/payslips`, `POST /api/v1/payroll/payslips` (admin gated).
- `GET/POST /api/v1/documents/policies`, `GET /api/v1/documents/user`.
- `GET /api/v1/onboarding/tasks`, `POST /api/v1/onboarding/tasks` (admin gated).
- `GET /api/v1/support/faqs`, `POST /api/v1/support/contact`.

## Minimal security defaults
- JWT access + refresh tokens; `Authorization: Bearer <token>` required for protected routes.
- Basic RBAC middleware; extend roles/permissions in DB.
- Helmet, CORS, JSON size limit, and morgan logging enabled.

## Roadmap / next steps
- Wire DB queries into module routes (replace stubs with real services).
- Add storage integration (Wasabi/Backblaze/S3-compatible) for photos/docs via pre-signed URLs.
- Add rate limiting for OTP and login endpoints (consider Redis later).
- Scaffold frontend (Vite React) for employee/admin portals.