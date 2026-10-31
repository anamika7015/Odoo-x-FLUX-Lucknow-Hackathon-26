# Functionality audit and implementation checklist

Audit date: 2026-10-31. This checklist records the existing implementation before the complete-functionality pass. “Partial” means a usable API or UI exists but the described workflow is not complete end to end.

## Application shell and authentication

- [x] Existing React/Vite shell, router, Redux session state, React Query, Axios, responsive dashboard, and light/dark/system tokens are present.
- [x] Signup/login form submits to cookie-session endpoints; server validates and hashes passwords.
- [x] Persist a Customer profile as part of customer signup; legacy customer accounts are repaired on login.
- [x] Backend forgot-password/reset endpoints and email adapter exist.
- [x] Add forgot-password/reset UI with validation and SMTP setup hint.
- [x] Backend CSRF, session refresh, logout, role checks, and administrator-only staff creation exist.
- [x] Add admin-only staff/user listing, role updates, activation/suspension, and audited staff creation.
- [x] Add route-level guards for admin/staff-only frontend paths; backend remains the authority.
- [x] Server-verified Admin/Customer demo login uses configured credentials, bcrypt, role checks, rate limiting, and the regular secure session cookies.
- [x] Demo dataset seeding is idempotent, checks account collisions, and refuses production; reset requires an explicit confirmation token and is also disabled in production.

## Existing working modules

- [x] Products: create/edit/archive, search/status filters, server pagination, and variant list/create/edit/deactivate with server-calculated additional pricing.
- [x] Plans: create, list, filters and update API.
- [x] Plan UI supports edit/deactivate, availability windows, currency, and lifecycle flags.
- [x] Customers: create/edit, pagination/search/status filters, account history, email-to-login synchronization, and deactivation business rules.
- [x] Customer list/detail endpoints enforce signed-in customer ownership; staff/admin can still manage the full customer directory.

## Business lifecycle modules

- [x] Quotations: backend multi-line server-priced templates with edit/status management, estimated eligible discounts and effective taxes, publish/email/accept/reject/convert APIs.
- [x] Quotation UI connects multi-line template management and draft create/edit/delete, estimated tax/discount breakdown, publish/email, customer accept/reject, and conversion.
- [x] Subscriptions: backend conversion, lifecycle transitions, pre-activation contract quantity/terms edits, pagination, ownership checks and history.
- [x] Subscription UI connects list/status filters, detail/history, pre-activation edits, and plan-permitted lifecycle actions; customer portal exposes permitted pause/resume/close requests.
- [x] Tax rules and invoices: backend tax snapshots, period uniqueness, confirmation/cancellation, overdue query, PDF, and email endpoints.
- [x] Tax and invoice UIs connect tax CRUD/status/edit, invoice generation, server-side invoice search, draft due-date edit, transition/filter/PDF/email flows.
- [x] Discounts support fixed/percentage values, product/subscription scope, dates, minimums, usage caps, auto-apply/code, admin CRUD, and invoice snapshots.
- [x] Payments record partial/full amounts, reject overpayment/duplicate references, reconcile balances transactionally, and allow audited metadata edits without changing financial amounts.
- [x] Recurring billing runs every minute in the configured timezone, records unique subscription-period events, prevents duplicate invoices, retries failures with capped backoff, automatically expires configured subscriptions, and tracks/retries invoice email notifications.

## Reporting, portal, settings, and operations

- [x] Overview displays ten database-backed KPIs, collected-revenue chart, recent audit activity, upcoming renewals, and overdue invoices.
- [x] Reports page now supports date filters, currency-aware collected/invoiced/MRR/ARR/outstanding totals, overdue balances, subscription growth, and revenue grouped by plan/product snapshots.
- [x] Customer portal connects own profile, subscriptions, invoices, payments, recent quotations, profile update, invoice/quotation PDFs, and valid quotation accept/reject; inactive customer records cannot log in or refresh sessions.
- [x] Settings provides real user/staff management with server-side filtering, pagination, role changes, and account suspension.
- [x] In-app notifications for published quotations, confirmed invoices, and recorded payments; users can list and mark their own notifications read.
- [x] Cross-module integration tests cover customer registration/login, role/ownership enforcement, quotation-to-subscription conversion, invoice confirmation, partial/full payments, report date filters, notifications, and recurring-billing idempotency.
- [ ] SMTP delivery remains environment-dependent. Tests verified that missing SMTP is tracked for retry; successful real delivery requires configured credentials.
- [x] Headless Chrome against a disposable local replica set verified login/signup, admin navigation across every page, customer quotation acceptance, subscription activation, invoice generation/confirmation, payment entry, balance reconciliation, and light/dark theme switching.
- [ ] Browser workflows against the configured Atlas database remain unverified: the current environment cannot resolve/connect to the configured MongoDB SRV host. No production database credentials or external SMTP credentials were changed.
- [x] Disposable MongoDB verification seeded the required interconnected demo counts, reran without duplicates, exercised both demo roles and dashboard aggregations, and reset all seed data cleanly.

## Implementation order

1. Fix signup-to-customer identity and customer resource ownership.
2. Finish existing catalog/customer/plan CRUD controls without changing page design.
3. Connect quotation, subscription, tax, invoice and portal pages to the delivered APIs.
4. Implement discounts and payment reconciliation, then the durable billing worker.
5. Replace remaining placeholder sections with backed analytics and operations flows.
6. Add user/settings/notification workflows and complete cross-role integration checks.
