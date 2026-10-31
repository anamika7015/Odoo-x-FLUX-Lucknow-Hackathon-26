# Database relationships and invariants

| Model | Key relationships | Essential constraints / indexes |
|---|---|---|
| User | optional customer identity, role | unique normalized email; role |
| Customer | user, subscriptions, invoices, payments | normalized email; status + createdAt |
| Product / ProductVariant | catalog and variants | unique `{productId, normalizedName}` variant |
| Plan | product | product + status + availability dates |
| Quotation / Template | customer and product/plan lines | unique quotation number; status + expiry |
| Subscription / History | customer, plan, immutable line snapshot | unique subscription number; status + nextBillingDate |
| Tax / Discount | applicability, date windows | unique normalized tax/code; active period |
| Invoice | customer, subscription, snapshot | unique invoice number and unique subscription billing period |
| Payment | customer, invoice | unique payment reference; invoice + paymentDate |
| BillingEvent | subscription, period | unique idempotency key; retry state |
| Notification / AuditLog | recipient / actor + target | recipient + readAt; target + createdAt |

`User(role=CUSTOMER)` maps to one customer identity. Customer ownership is enforced by user/customer linkage, not submitted IDs. Catalog records remain references; quotations, subscriptions, and invoices store only necessary financial snapshots (name, price, quantity, tax, discount, totals). A confirmed invoice stays immutable except for audited payment roll-ups and permitted cancellation.

Financial values use integer minor currency units (paise) plus currency (initially INR), never floating point.

## Transaction boundaries

| Operation | Atomic records |
|---|---|
| Accepted quotation conversion | quotation, subscription, history, audit |
| Billing a period | billing event, invoice, subscription date/history, notification outbox |
| Payment recording | payment, invoice balances/state, audit |
| Limited coupon redemption | discount counter, invoice snapshot, billing event |

Mongo transactions and unique indexes work together to make concurrent requests safe.
