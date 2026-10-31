import { describe, expect, it } from 'vitest';
import { calculateVariantFinalPrice } from '../src/services/product.service.js';
import { createProductSchema, createVariantSchema, listProductsQuerySchema } from '../src/validators/product.validator.js';

describe('product catalog validation and pricing', () => {
  it('accepts prices only in whole paise and normalizes currency', () => {
    const result = createProductSchema.safeParse({ name: 'Flux CRM', productType: 'SaaS', salesPrice: 200000, costPrice: 45000, currency: 'inr' });
    expect(result.success).toBe(true);
    expect(result.data.currency).toBe('INR');
    expect(result.data.salesPrice).toBe(200000);
  });

  it('rejects fractional and negative pricing', () => {
    expect(createProductSchema.safeParse({ name: 'Flux CRM', productType: 'SaaS', salesPrice: 10.5, costPrice: 1 }).success).toBe(false);
    expect(createVariantSchema.safeParse({ name: 'Enterprise', attribute: 'Edition', additionalPrice: -1 }).success).toBe(false);
  });

  it('calculates the final variant price server-side', () => {
    expect(calculateVariantFinalPrice(200000, 56000)).toBe(256000);
  });

  it('caps list pages and validates query inputs', () => {
    expect(listProductsQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(listProductsQuerySchema.parse({}).limit).toBe(20);
  });
});
