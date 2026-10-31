# Brightloop architecture

## System context

Brightloop is a multi-role SaaS billing platform. Admin and staff use the internal dashboard; customers use a constrained portal over the same versioned REST API. MongoDB is the system of record. Redis/BullMQ handles durable asynchronous billing, email, PDF, and retry work; cron only enqueues due work.

```text
Browser
  | React + Vite SPA (admin/staff workspace and customer portal)
  | HTTPS, versioned JSON API, secure cookie session
  v
Express API (stateless) ----------------------> MongoDB Atlas replica set
  |                                                system of record
  +--> Redis/BullMQ --> isolated workers --> SMTP provider
  |          ^                     +---------> PDF generation
  |          |                                 + optional object storage
  +--> cron enqueues due work; workers own retries and idempotency
```

## Architecture decisions

| Concern | Decision | Reason / boundary |
|---|---|---|
| Application shape | React SPA and stateless Express REST API, versioned at `/api/v1` | Frontend and API can deploy and scale independently. |
| Persistence | MongoDB with Mongoose; production requires a replica set | Document snapshots fit billing records; multi-record money operations need transactions. |
| Money | Integer minor units (INR paise) and explicit currency | Avoid binary floating-point drift in invoices and payments. |
| Authentication | Short-lived access JWT in an HTTP-only cookie, refresh session with rotation, CSRF token on unsafe cookie-authenticated requests | Scripts cannot read the session cookie; CSRF remains explicit. |
| Authorization | Role checks and resource ownership checks in API middleware/services | Client navigation is not a security boundary. |
| Billing | Cron dispatches due work to durable queue; idempotent worker creates period invoices | A process-local timer cannot guarantee delivery or safe retry. |
| Financial history | Immutable line snapshots on subscription/invoice; audit trail for sensitive mutations | Catalog edits must not rewrite contracted or billed prices. |
| Files and email | Generate PDF/email asynchronously; object storage is optional and private | Keep API requests responsive and avoid public invoice URLs. |
| Theme | CSS custom properties mapped to Tailwind tokens; `light`, `dark`, and `system` persisted before React loads | One token system prevents theme drift and initial wrong-theme flashes. |

## Domain flow

```text
User/Customer -> Quotation -> Subscription -> BillingEvent -> Invoice <- Tax/Discount snapshot
                                              |                ^
                                              + next due date  |
Customer -> Payment -> allocation/reconciliation ---------------+
```

Quotation acceptance, period billing, and payment recording are transactional use-cases. See [data relationships](data-model.md) and [financial rules](business-rules.md).

## Code boundaries

- `routes`: HTTP routing and middleware composition only.
- `controllers`: validated request/response adaptation only.
- `services`: transactional business use-cases and calculations.
- `models`: schemas, indexes, and persistence concerns only.
- `validators`: request schemas; client validation is UX only, never trust.
- `jobs`: idempotent processors. No in-memory timer is a billing correctness dependency.

## Security and deployment

The request pipeline applies rate limiting, Helmet, body limits, cookie parsing, sanitization, CORS allowlisting, authentication, role/ownership checks, then service calls. Financial mutations use Mongo sessions, audit logs, and safe centralized errors.

- Frontend: Vercel static hosting.
- API and worker: independently scalable Render/Railway/AWS services.
- MongoDB Atlas: replica set required for transactions.
- Managed Redis: BullMQ queues, delayed jobs, and deduplication.
- Operations: structured logs, error tracking, queue failure alerts, uptime checks, and daily billing reconciliation.

## Folder structure

```text
client/
  index.html                 # theme bootstrap runs before React
  src/
    components/              # reusable UI and feedback
    features/                 # domain-specific UI/state (grow modules here)
    layouts/                  # role-specific shells/navigation
    lib/                      # theme, formatting, shared utilities
    pages/                    # route-level screens
    services/                 # HTTP client and API adapters
    store/                    # Redux Toolkit client/session state
    styles/                   # global CSS variables and Tailwind layers
server/
  src/
    config/                   # validated env and infrastructure lifecycle
    controllers/              # HTTP adaptation; no domain calculations
    jobs/                     # durable queue processors and schedules
    middleware/               # request context, auth, validation, errors
    models/                   # Mongoose schemas and indexes
    routes/                   # REST module registration
    services/                 # domain rules and transactional use-cases
    templates/                # reusable email templates
    utils/                    # shared server-only helpers
    validators/               # API request validation
    scripts/                  # explicit operator commands
  test/                       # unit and API integration tests
docs/                         # architecture, API, data, rules, roadmap
```

## Trust boundaries and role summary

| Role | Data and actions |
|---|---|
| ADMIN | Full business configuration, user/staff administration, financial records and reports. |
| STAFF | Customers, quotations, subscriptions, invoices, payment entry, operational reports. No staff creation or restricted settings. |
| CUSTOMER | Own profile, subscriptions, invoices, and payment history only; no internal workspace APIs. |

Customer identity is resolved from the authenticated session on the server. Submitted customer IDs are never sufficient proof of ownership. See [API module access](api-contract.md).

## Deployment boundaries

Vercel hosts the static SPA. API and queue worker are separate processes/services on Render, Railway, or AWS. Atlas is a replica set and managed Redis is required before durable billing jobs are enabled. SMTP credentials, signing secrets, database credentials, and storage credentials exist only in deployment secret stores or ignored local `.env` files. `.env.example` contains placeholders only.
