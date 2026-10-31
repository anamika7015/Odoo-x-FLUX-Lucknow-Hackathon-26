import { describe, expect, it } from 'vitest';
import { calculateDiscountAmount } from '../src/services/discount.service.js';
import { createDiscountSchema } from '../src/validators/discount.validator.js';

describe('discount rules', () => {
  it('caps fixed discounts and rounds percentages half-up in paise', () => {
    expect(calculateDiscountAmount(1_000, 'FIXED', 1_500)).toBe(1_000);
    expect(calculateDiscountAmount(999, 'PERCENTAGE', 1_500)).toBe(150);
    expect(calculateDiscountAmount(1, 'PERCENTAGE', 5_000)).toBe(1);
  });

  it('validates product scope, percentage bounds, and date windows', () => {
    const base = { name: 'Annual saving', code: 'SAVE20', type: 'PERCENTAGE', value: 2_000, targetType: 'PRODUCT', appliesTo: ['a'.repeat(24)] };
    expect(createDiscountSchema.safeParse(base).success).toBe(true);
    expect(createDiscountSchema.safeParse({ ...base, value: 10_001 }).success).toBe(false);
    expect(createDiscountSchema.safeParse({ ...base, appliesTo: [] }).success).toBe(false);
    expect(createDiscountSchema.safeParse({ ...base, startsAt: '2026-09-02', endsAt: '2026-09-01' }).success).toBe(false);
  });
});
