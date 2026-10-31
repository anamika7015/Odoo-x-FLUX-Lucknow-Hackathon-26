import { describe, expect, it } from 'vitest';
import { calculateNextBillingDate } from '../src/services/plan.service.js';
import { createPlanSchema } from '../src/validators/plan.validator.js';

describe('subscription plan rules', () => {
  it('calculates calendar-safe monthly and yearly billing dates', () => {
    expect(calculateNextBillingDate(new Date('2028-01-31T00:00:00.000Z'), 'MONTHLY').toISOString()).toBe('2028-02-29T00:00:00.000Z');
    expect(calculateNextBillingDate(new Date('2024-02-29T00:00:00.000Z'), 'YEARLY').toISOString()).toBe('2025-02-28T00:00:00.000Z');
    expect(calculateNextBillingDate(new Date('2026-01-01T00:00:00.000Z'), 'WEEKLY').toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('requires positive quantities and valid plan availability windows', () => {
    const base = { name: 'Growth', product: 'a'.repeat(24), billingPrice: 199900, billingFrequency: 'MONTHLY', minimumQuantity: 1 };
    expect(createPlanSchema.safeParse(base).success).toBe(true);
    expect(createPlanSchema.safeParse({ ...base, minimumQuantity: 0 }).success).toBe(false);
    expect(createPlanSchema.safeParse({ ...base, availabilityStartDate: '2026-02-02', availabilityEndDate: '2026-02-01' }).success).toBe(false);
  });
});
