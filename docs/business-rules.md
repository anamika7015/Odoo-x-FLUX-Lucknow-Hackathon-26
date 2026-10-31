# Business and financial rules

## Lifecycle and billing

- Quotation conversion requires `accepted`, non-expired status, happens once, and atomically creates the subscription.
- All subscription changes record actor, time, reason, and before/after state. Closed subscriptions require a new renewal operation.
- Pause, resume, renewal, and early closure validate the current plan permissions. Historic subscription pricing never changes with catalog edits.
- Billing is uniquely keyed by subscription and inclusive billing period. A unique invoice-period index plus billing event idempotency key makes retries safe.
- Each billing attempt persists. Failed events become retryable or terminal and alert operations; reconciliation detects unbilled due periods.

## Calculation policy

`effective unit price = plan price + selected variant additional price`

`line gross = effective unit price × quantity`

`eligible discount = fixed amount or rounded percentage, capped at gross`

`taxable amount = gross − allocated discount`

`line tax = half-up-round(subtotal × frozen tax rate)`

`invoice total = sum(line totals)`

`outstanding = invoice total − successful payment allocations`

- Percentage rounding is half-up at paise level; discount allocation remainders are deterministic.
- Discounts must be active, valid by date, applicable, and within usage/minimum limits. Product discounts apply only to selected products; subscription discounts cover all lines. The quote code carries onto the subscription, eligible automatic rules may also apply, and usage increments inside the invoice transaction.
- Each line resolves all active tax rules whose date window and product scope apply at period start, then freezes each rate and amount in the invoice. Tax rules are non-compounding and each applies to the pre-tax line subtotal.
- `Paid` requires zero outstanding. Positive payments cannot exceed outstanding until a credit/refund workflow is explicitly added.
- MRR is active recurring value normalized to a month; ARR is `MRR × 12`. Invoiced revenue, collected cash, and outstanding balances are separate metrics.
