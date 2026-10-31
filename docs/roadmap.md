# Delivery roadmap

| Phase | Scope | Exit evidence |
|---|---|---|
| 1 | Architecture and setup | docs, workspaces, theme tokens |
| 2 | Express/Mongo foundation | complete: config, DB lifecycle, health API, errors, and API tests |
| 3 | Auth and RBAC | complete: cookie sessions, CSRF, reset flow, role middleware, and validation/API tests |
| 4 | Products and variants | complete: catalog CRUD, price validation, variants, and admin authorization |
| 5 | Plans | complete: plan CRUD, availability rules, calendar-safe billing dates, and integrated catalog/plan frontend |
| 6 | Quotations/subscriptions | delivered: templates, pricing snapshots, publish/email/accept/convert flow, lifecycle history; integration-tested quote-to-subscription flow |
| 7 | Invoices/taxes | delivered: effective tax rules, frozen tax snapshots, unique subscription-period invoices, confirm/cancel, downloadable PDF and email; payment reconciliation is Phase 9 |
| 8 | Discounts | initial API delivered: admin rules, product/subscription scope, automatic/code eligibility, minimums, usage limits, deterministic invoice allocations |
| 9 | Payments | delivered: transactional partial-payment reconciliation, reference uniqueness, ownership-scoped history, and customer notifications; integration-tested |
| 10 | Recurring billing | delivered: minute scheduler, unique billing events, duplicate-safe invoice generation, capped retry backoff, expiry handling, tracked invoice email retries, and in-app invoice notifications; idempotency integration-tested |
| 11 | Reporting | delivered: date-filtered MongoDB totals, currency-aware revenue, subscription growth, and dashboard metrics; date-filter integration-tested |
| 12 | Customer portal | ownership-protected experience |
| 13 | UI integration | responsive dashboard and full themes |
| 14 | Hardening/release | unit and isolated replica-set integration suites pass; browser checks and live SMTP delivery still require reachable deployment services |

Each phase provides changed files, commands, endpoints, tests, known gaps, and a review checkpoint.
