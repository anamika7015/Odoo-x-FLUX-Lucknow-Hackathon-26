import { z } from 'zod';
import { discountTargets, discountTypes } from '../models/discount.model.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
const fields = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  type: z.enum(Object.values(discountTypes)),
  value: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  targetType: z.enum(Object.values(discountTargets)),
  appliesTo: z.array(objectId).max(100).default([]),
  minimumPurchase: z.coerce.number().int().nonnegative().default(0),
  minimumQuantity: z.coerce.number().int().positive().default(1),
  startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(),
  maxUses: z.coerce.number().int().positive().optional(), priority: z.coerce.number().int().min(0).max(10_000).default(100),
  autoApply: z.boolean().default(true), status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
const crossValidate = (value, context) => {
  if (value.type === 'PERCENTAGE' && value.value > 10_000) context.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Percentage cannot exceed 100%.' });
  if (value.type === 'FIXED' && value.value > Number.MAX_SAFE_INTEGER) context.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Fixed discount is too large.' });
  if (value.targetType === 'PRODUCT' && value.appliesTo?.length === 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['appliesTo'], message: 'Select at least one product for a product-targeted discount.' });
  if (value.targetType === 'SUBSCRIPTION' && value.appliesTo?.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['appliesTo'], message: 'Subscription discounts apply to all lines; do not select products.' });
  if (value.startsAt && value.endsAt && value.endsAt < value.startsAt) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'Discount end date must not precede its start date.' });
};
export const createDiscountSchema = fields.superRefine(crossValidate);
export const updateDiscountSchema = fields.partial().extend({ startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), maxUses: z.coerce.number().int().positive().nullable().optional() }).refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.').superRefine(crossValidate);
export const discountParamsSchema = z.object({ discountId: objectId });
export const listDiscountQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['ACTIVE', 'INACTIVE']).optional(), search: z.string().trim().max(100).optional() });
