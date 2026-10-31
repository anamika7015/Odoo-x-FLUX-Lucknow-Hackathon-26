# Brightloop Software — Subscription Management Platform

Enterprise subscription billing SaaS built with React/Vite, Express, and MongoDB.

## Delivery status

Phase 1 delivered architecture, domain/API design, the delivery roadmap, monorepo workspace scaffold, and no-flash light/dark theme tokens.

Phase 2 delivers the Express/MongoDB foundation: environment validation, connection lifecycle, security headers, CORS allowlisting, request IDs, API rate limits, JSON limits, structured errors, graceful shutdown, and health probes. Read [architecture](docs/architecture.md), [data model](docs/data-model.md), [API contract](docs/api-contract.md), [business rules](docs/business-rules.md), and [roadmap](docs/roadmap.md).

Phase 3 delivers authentication: validated customer registration, HTTP-only JWT session cookies, CSRF tokens, session refresh/logout, password-reset tokens, role middleware, and administrator-only staff creation.

Phase 4 delivers product catalog APIs: admin-managed products and variants, server-side dynamic variant pricing, pagination/search/filtering, and immutable-price-ready integer paise amounts.

Phase 5 delivers subscription-plan APIs plus the integrated frontend for the completed modules: registration/sign-in, protected workspace, light/dark/system theme control, products, and billing plans. The UI communicates only with the implemented backend endpoints; future modules are intentionally not shown as completed features.

Phase 6 delivers quotation templates and a subscription lifecycle API: staff can draft and publish quotations from server-priced plan lines, customers can accept only their own published quotations, and staff can atomically convert accepted quotations into subscriptions. Subscription activation, pause/resume, closure, renewal, pagination, ownership checks, and transition history are included. Quotation email delivery remains future work.

Phase 7 delivers tax rules and invoice handling: admins manage date- and product-scoped percentage tax rules; staff generate a draft invoice for a subscription billing period, confirm or cancel it, and download a PDF. Amounts and tax are calculated on the server and snapshotted. A unique subscription-period index prevents duplicate invoices. Automatic due-period dispatch remains future work.

Phase 8 delivers admin discount rules with fixed or percentage values, product or subscription scope, minimum purchase/quantity, active dates, usage limits, automatic application, and quote discount codes. Invoice discount allocation and usage increments are atomic with invoice creation; invoice lines snapshot applied discounts before tax calculation.

Phase 9 delivers append-only payment reconciliation: staff/admin record cash, bank transfer, card, UPI, or other receipts in paise. Partial payments leave an invoice confirmed with a reduced balance; only a zero balance marks it paid. Duplicate references and overpayments are rejected, and customer payment history is ownership-scoped.

## Prerequisites

- Node.js 20.11+ and npm 10+
- MongoDB replica set / Atlas (needed in Phase 2)
- Redis (needed in Phase 10)

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Create the initial administrator once MongoDB is running (do not expose this command or its password in deployment logs):

```bash
npm run bootstrap:admin --workspace=server -- "Brightloop Admin" admin@example.com "Strong!Password1"
```

## Health endpoints

- `GET /api/v1/health/live` — process liveness; suitable for the platform liveness probe.
- `GET /api/v1/health/ready` — returns `200` only when MongoDB is connected; suitable for the readiness probe.

## Authentication endpoints

- `GET /api/v1/auth/csrf` — issue CSRF cookie/token before cookie-authenticated mutations.
- `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`
- `POST /api/v1/auth/forgot-password`, `/reset-password`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/staff` — ADMIN only; requires authentication and CSRF token.

## Product endpoints

All product endpoints require authentication. `POST` and `PATCH` endpoints additionally require an ADMIN session and matching CSRF token.

- `GET/POST /api/v1/products`
- `GET/PATCH /api/v1/products/:productId`
- `GET/POST /api/v1/products/:productId/variants`
- `PATCH /api/v1/products/:productId/variants/:variantId`

## Plan endpoints

All plan endpoints require authentication. Create and update require an ADMIN session and matching CSRF token.

- `GET/POST /api/v1/plans`
- `GET/PATCH /api/v1/plans/:planId`

## Quotation and subscription endpoints

All endpoints require an authenticated session. Mutations require the CSRF token. Staff/admin create templates and quotations; customers can list/read/accept only quotations and subscriptions tied to their account.

- `GET/POST /api/v1/quotations/templates`
- `GET/POST /api/v1/quotations`
- `GET /api/v1/quotations/:id`
- `POST /api/v1/quotations/:id/publish` (ADMIN/STAFF)
- `POST /api/v1/quotations/:id/accept` (owner or staff)
- `POST /api/v1/quotations/:id/convert` (ADMIN/STAFF; transactional, one time)
- `GET /api/v1/subscriptions` and `GET /api/v1/subscriptions/:id`
- `POST /api/v1/subscriptions/:id/:action` where action is `activate`, `pause`, `resume`, `close`, or `renew`

## Tax and invoice endpoints

Tax reads require a session; only admins can create or update tax rules. Invoice reads and PDFs are restricted to the owning customer or internal staff. Staff/admin create and transition invoices with CSRF protection.

- `GET/POST /api/v1/taxes`, `PATCH /api/v1/taxes/:taxId`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices/from-subscription` with `subscription`, `periodStart`, and optional `dueDate`
- `GET /api/v1/invoices/:invoiceId`, `GET /api/v1/invoices/:invoiceId/pdf`
- `POST /api/v1/invoices/:invoiceId/confirm` or `/cancel`

## Payment endpoints

Staff/admin can record payments against confirmed invoices. Payments are append-only; partial payments keep the invoice confirmed with an outstanding balance, and the final allocation marks it paid. Customers can read only their own payment history.

- `GET /api/v1/payments`
- `POST /api/v1/payments` with invoice, amount in paise, method, date, optional reference, and note
- `GET /api/v1/payments/:paymentId`

## Discount endpoints

Authenticated staff can view rules; only admins can create or update them.

- `GET /api/v1/discounts`
- `POST /api/v1/discounts`
- `PATCH /api/v1/discounts/:discountId`

## Frontend API configuration

The client defaults to `http://localhost:5000/api/v1`. To use another API base URL, set `VITE_API_URL` in `client/.env.local`.

## Demo accounts and sample data

Set `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_CUSTOMER_EMAIL`, and `DEMO_CUSTOMER_PASSWORD` in `server/.env` (or the root `.env`). Use unique passwords meeting the normal account password policy. Demo login remains disabled until these accounts and the sample data have been seeded.

```bash
npm run seed:demo --workspace=server
```

The seed command is idempotent and refuses to overwrite accounts that are not already marked as demo accounts. It is disabled in production. To remove the seeded records in a development/test database, run:

```bash
CONFIRM_DEMO_RESET=DELETE_DEMO_DATA npm run reset:demo --workspace=server
```

The reset command refuses production and requires the explicit confirmation value. Keep demo credentials out of production configuration.

## Verification

```bash
npm run test --workspace=server
npm run build
```

See [the functionality audit](docs/functionality-audit.md) and [roadmap](docs/roadmap.md) for the current implementation status.
