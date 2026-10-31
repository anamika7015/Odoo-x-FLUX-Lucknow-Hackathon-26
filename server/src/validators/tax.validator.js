import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
const optionalDate = z.coerce.date().nullable().optional();
const fields = z.object({
  name: z.string().trim().min(2).max(120),
  rateBasisPoints: z.coerce.number().int().min(0).max(10_000),
  appliesTo: z.array(objectId).max(100).default([]),
  effectiveFrom: optionalDate,
  effectiveUntil: optionalDate,
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
const validWindow = (value, context) => {
  if (value.effectiveFrom && value.effectiveUntil && value.effectiveUntil < value.effectiveFrom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveUntil'], message: 'Tax end date must not precede its start date.' });
};
export const createTaxSchema = fields.superRefine(validWindow);
export const updateTaxSchema = fields.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.').superRefine(validWindow);
export const taxParamsSchema = z.object({ taxId: objectId });
export const listTaxQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['ACTIVE', 'INACTIVE']).optional(), search: z.string().trim().max(100).optional() });
