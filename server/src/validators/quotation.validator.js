import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
const line = z.object({ plan: objectId, variant: objectId.optional(), quantity: z.coerce.number().int().min(1) });
export const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(160), description: z.string().trim().max(2_000).optional(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30), paymentTerms: z.string().trim().max(2_000).optional(),
  lines: z.array(line).min(1).max(50),
});
export const createQuotationSchema = z.object({
  customer: objectId, template: objectId.optional(), lines: z.array(line).min(1).max(50).optional(),
  validityDays: z.coerce.number().int().min(1).max(365).optional(), paymentTerms: z.string().trim().max(2_000).optional(),
}).refine((input) => Boolean(input.template || input.lines?.length), { message: 'Select a template or provide at least one line.' });
export const listQuotationQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CONVERTED']).optional(), search: z.string().trim().max(100).optional() });
export const resourceParamsSchema = z.object({ id: objectId });
export const transitionSchema = z.object({ reason: z.string().trim().max(1_000).optional() });
