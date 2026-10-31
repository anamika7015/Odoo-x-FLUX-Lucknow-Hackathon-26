import { describe, expect, it } from 'vitest';
import { createInvoiceSchema } from '../src/validators/invoice.validator.js';
import { createTaxSchema } from '../src/validators/tax.validator.js';
import { calculateTaxAmount } from '../src/services/invoice.service.js';

describe('invoice and tax rules', () => {
  it('rounds percentage tax half-up to integer paise', () => {
    expect(calculateTaxAmount(999, 1_800)).toBe(180);
    expect(calculateTaxAmount(1, 5_000)).toBe(1);
    expect(calculateTaxAmount(100, 0)).toBe(0);
  });

  it('validates tax rate and effective date range', () => {
    const base = { name: 'GST', rateBasisPoints: 1_800 };
    expect(createTaxSchema.safeParse(base).success).toBe(true);
    expect(createTaxSchema.safeParse({ ...base, rateBasisPoints: 10_001 }).success).toBe(false);
    expect(createTaxSchema.safeParse({ ...base, effectiveFrom: '2026-08-02', effectiveUntil: '2026-08-01' }).success).toBe(false);
  });

  it('accepts a subscription period start and never accepts client totals', () => {
    const result = createInvoiceSchema.safeParse({ subscription: 'a'.repeat(24), periodStart: '2026-08-01', total: 1 });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('total');
    expect(createInvoiceSchema.safeParse({ subscription: 'a'.repeat(24), periodStart: 'bad-date', total: 1 }).success).toBe(false);
  });
});
