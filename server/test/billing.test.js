import { describe, expect, it } from 'vitest';
import { BillingEvent } from '../src/models/billing-event.model.js';
import { billingRetryAt, runRecurringBilling } from '../src/services/billing.service.js';

describe('recurring billing idempotency and retries', () => {
  it('has a unique subscription and billing-period key', () => {
    const index = BillingEvent.schema.indexes().find(([keys]) => keys.subscription === 1 && keys.periodStart === 1);
    expect(index?.[1]?.unique).toBe(true);
  });

  it('backs off failed attempts and caps retries', () => {
    const now = new Date('2026-10-31T00:00:00.000Z');
    expect(billingRetryAt(now, 1).getTime() - now.getTime()).toBe(5 * 60_000);
    expect(billingRetryAt(now, 2).getTime() - now.getTime()).toBe(10 * 60_000);
    expect(billingRetryAt(now, 8)).toBeUndefined();
  });

  it('does not query or mutate data while MongoDB is disconnected', async () => {
    const result = await runRecurringBilling();
    expect(result).toEqual({ billed: 0, failed: 0, skipped: 0, databaseReady: false });
  });
});
