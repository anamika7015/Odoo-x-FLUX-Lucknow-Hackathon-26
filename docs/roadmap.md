# Delivery roadmap

| Phase | Scope | Exit evidence |
|---|---|---|
| 1 | Architecture and setup | docs, workspaces, theme tokens |
| 2 | Express/Mongo foundation | complete: config, DB lifecycle, health API, errors, and API tests |
| 3 | Auth and RBAC | complete: cookie sessions, CSRF, reset flow, role middleware, and validation/API tests |
| 4 | Products and variants | complete: catalog CRUD, price validation, variants, and admin authorization |
| 5 | Plans | complete: plan CRUD, availability rules, calendar-safe billing dates, and integrated catalog/plan frontend |
| 6 | Quotations/subscriptions | initial API delivered: templates, pricing snapshots, publish/accept/convert flow, lifecycle history; add email delivery and deeper integration tests |
| 7 | Invoices/taxes | initial API delivered: effective tax rules, frozen tax snapshots, unique subscription-period invoices, confirm/cancel, downloadable PDF; payment state remains Phase 9 |
| 8 | Discounts | eligibility and concurrency protection |
| 9 | Payments | partial payment reconciliation |
| 10 | Recurring billing | queues, retries, reconciliation |
| 11 | Reporting | server aggregations and dashboard |
| 12 | Customer portal | ownership-protected experience |
| 13 | UI integration | responsive dashboard and full themes |
| 14 | Hardening/release | tests, review, deployment runbook |

Each phase provides changed files, commands, endpoints, tests, known gaps, and a review checkpoint.
