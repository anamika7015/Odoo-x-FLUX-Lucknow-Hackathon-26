import { describe, expect, it } from 'vitest';
import { calculateInvoiceBalance } from '../src/services/payment.service.js';

describe('payment reconciliation', () => {
  it('keeps partial payments outstanding', () => {
    expect(calculateInvoiceBalance(0, 10_000, 4_000)).toEqual({ amountPaid: 4_000, outstanding: 6_000, status: 'CONFIRMED' });
  });

  it('marks the invoice paid only when outstanding reaches zero', () => {
    expect(calculateInvoiceBalance(4_000, 6_000, 6_000)).toEqual({ amountPaid: 10_000, outstanding: 0, status: 'PAID' });
  });

  it('rejects overpayments and non-integer monetary values', () => {
    expect(() => calculateInvoiceBalance(0, 100, 101)).toThrow(/outstanding balance/);
    expect(() => calculateInvoiceBalance(0, 100, 1.5)).toThrow(/integer minor units/);
  });
});
