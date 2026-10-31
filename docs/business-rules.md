# Business and financial rules

## Lifecycle and billing

- Quotation conversion requires `accepted`, non-expired status, happens once, and atomically creates the subscription.
- All subscription changes record actor, time, reason, and before/after state. Closed subscriptions require a new renewal operation.
- Pause, resume, renewal, and early closure validate the current plan permissions. Historic subscription pricing never changes with catalog edits.
- Billing is uniquely keyed by subscription and inclusive billing period. A unique invoice-period index plus billing event idempotency key makes retries safe.
- Each billing attempt persists. Failed events become retryable or terminal and alert operations; reconciliation detects unbilled due periods.

## Calculation policy

`line gross = unit price × quantity`

`eligible discount = fixed amount or rounded percentage, capped at gross`

`taxable amount = gross − allocated discount`

`line tax = round(taxable amount × frozen tax rate)`

`invoice total = sum(line totals)`

`outstanding = invoice total − successful payment allocations`

- Percentage rounding is half-up at paise level; discount allocation remainders are deterministic.
- Discounts must be active, valid by date, applicable, and within usage/minimum limits. Usage increments inside the invoice transaction.
- Each line resolves the applicable effective tax rule then freezes its rate and amount in the invoice.
- `Paid` requires zero outstanding. Positive payments cannot exceed outstanding until a credit/refund workflow is explicitly added.
- MRR is active recurring value normalized to a month; ARR is `MRR × 12`. Invoiced revenue, collected cash, and outstanding balances are separate metrics.
