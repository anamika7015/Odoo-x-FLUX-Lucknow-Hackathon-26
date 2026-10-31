import { describe, expect, it } from 'vitest';
import { createQuotationSchema, createTemplateSchema, transitionSchema } from '../src/validators/quotation.validator.js';

describe('quotation and subscription request rules', () => {
  it('accepts quotation lines with server-resolved plans and bounded quantities', () => {
    const base = { customer: 'a'.repeat(24), lines: [{ plan: 'b'.repeat(24), quantity: 3 }], discountCode: 'SAVE20' };
    expect(createQuotationSchema.safeParse(base).success).toBe(true);
    expect(createQuotationSchema.safeParse({ ...base, lines: [{ ...base.lines[0], quantity: 0 }] }).success).toBe(false);
    expect(createQuotationSchema.safeParse({ customer: base.customer }).success).toBe(false);
  });

  it('requires at least one line in reusable templates', () => {
    expect(createTemplateSchema.safeParse({ name: 'Annual package', lines: [{ plan: 'b'.repeat(24), quantity: 10 }] }).success).toBe(true);
    expect(createTemplateSchema.safeParse({ name: 'Empty template', lines: [] }).success).toBe(false);
  });

  it('bounds transition reason text', () => {
    expect(transitionSchema.safeParse({ reason: 'Customer requested closure.' }).success).toBe(true);
    expect(transitionSchema.safeParse({ reason: 'x'.repeat(1_001) }).success).toBe(false);
  });
});
