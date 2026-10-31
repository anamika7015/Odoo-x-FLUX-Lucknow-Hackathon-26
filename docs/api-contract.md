# API module contract

Base URL: `/api/v1`. Successful JSON follows `{ "success": true, "data": {}, "meta": {} }`; failures follow `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`. Lists validate and cap `page`, `limit`, `sort`, `search`, and resource filters.

| Module | Primary endpoint group | Access |
|---|---|---|
| Auth | `/auth` registration, session, recovery, me | public/authenticated |
| Users | `/users` staff management | admin |
| Customers | `/customers` CRUD and histories | admin/staff; customer owns self |
| Products | `/products` and variants | admin write; internal read |
| Plans | `/plans` | admin write; internal read |
| Quotations | `/quotations` send, accept, convert | admin/staff; owned customer read |
| Subscriptions | `/subscriptions` lifecycle operations | role + ownership |
| Invoices | `/invoices` lifecycle/email/PDF | staff/admin; owned customer read |
| Taxes / Discounts | `/taxes`, `/discounts` | admin write |
| Payments | `/payments` record/reconcile | staff/admin; owned customer read |
| Reports | `/reports` aggregation endpoints | admin; limited staff |
| Notifications | `/notifications` list/mark-read | own notifications |
| Settings | `/settings` billing/company config | admin |

Every mutation receives server validation. Services recheck resource ownership; UI navigation never constitutes authorization.
