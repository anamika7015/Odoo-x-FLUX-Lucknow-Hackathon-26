# API module contract

Base URL: `/api/v1`. Successful JSON follows `{ "success": true, "data": {}, "meta": {} }`; failures follow `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`. Lists validate and cap `page`, `limit`, `sort`, `search`, and resource filters.

| Module | Primary endpoint group | Access |
|---|---|---|
| Auth | `/auth` registration, session, recovery, me | public/authenticated |
| Users | `/users` list/update users; `/auth/staff` creates staff accounts | admin |
| Customers | `/customers` CRUD, self profile, and subscription/invoice/payment histories | admin/staff; customer owns self |
| Products | `/products` and variants | admin write; internal read |
| Plans | `/plans` | admin write; internal read |
| Quotations | `/quotations` multi-line server-priced templates with edit/status management, tax/discount estimates, create, edit/delete draft, publish/email, accept/reject, convert | admin/staff write; owned customer read/accept/reject |
| Subscriptions | `/subscriptions` list, inspect, edit confirmed contract quantities/terms before activation, activate, pause, resume, close, renew | role + ownership |
| Invoices | `/invoices` subscription-period draft, due-date edit while draft, confirm/cancel, PDF and email | staff/admin write; owned customer read/PDF |
| Taxes / Discounts | `/taxes`, `/discounts` | admin write; tax rules freeze on invoice lines |
| Payments | `/payments` record/reconcile; edit audited payment metadata while preserving amount and invoice | staff/admin write; owned customer read |
| Reports | `/reports/dashboard` database-driven metrics, date-filtered trends, billing and email failures | admin/staff |
| Notifications | `/notifications` list, mark one read (`PATCH /:notificationId/read`) or all read (`POST /read-all`) | own notifications |
| Settings | `/users` staff listing, role and account status updates; `/auth/staff` staff creation | admin |

Every mutation receives server validation. Services recheck resource ownership; UI navigation never constitutes authorization.
