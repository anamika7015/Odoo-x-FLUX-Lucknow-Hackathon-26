import { z } from 'zod';
import { productStatuses } from '../models/product.model.js';

const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency must be a three-letter ISO code.');
const money = z.coerce.number().int().nonnegative('Amounts must be non-negative integer paise.');
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  productType: z.string().trim().min(1).max(80),
  description: z.string().trim().max(4_000).optional(),
  salesPrice: money,
  costPrice: money,
  currency: currency.default('INR'),
  notes: z.string().trim().max(4_000).optional(),
  status: z.enum(Object.values(productStatuses)).optional(),
});
export const updateProductSchema = createProductSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
export const createVariantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  attribute: z.string().trim().min(1).max(80),
  additionalPrice: money.default(0),
  status: z.enum(Object.values(productStatuses)).optional(),
});
export const updateVariantSchema = createVariantSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
export const productParamsSchema = z.object({ productId: objectId });
export const variantParamsSchema = z.object({ productId: objectId, variantId: objectId });
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(), status: z.enum(Object.values(productStatuses)).optional(), productType: z.string().trim().max(80).optional(),
});
