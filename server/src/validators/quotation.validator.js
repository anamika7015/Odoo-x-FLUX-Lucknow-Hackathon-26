import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
const line = z.object({ plan: objectId, variant: objectId.optional(), quantity: z.coerce.number().int().min(1) });
export const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(160), description: z.string().trim().max(2_000).optional(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30), paymentTerms: z.string().trim().max(2_000).optional(),
  lines: z.array(line).min(1).max(50),
});
export const updateTemplateSchema = createTemplateSchema.partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE']).optional() }).refine((input) => Object.keys(input).length > 0, 'Provide template fields to update.');
export const createQuotationSchema = z.object({
  customer: objectId, template: objectId.optional(), lines: z.array(line).min(1).max(50).optional(),
  validityDays: z.coerce.number().int().min(1).max(365).optional(), paymentTerms: z.string().trim().max(2_000).optional(), discountCode: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/).optional(),
}).refine((input) => Boolean(input.template || input.lines?.length), { message: 'Select a template or provide at least one line.' });
export const updateDraftQuotationSchema = z.object({
  validityDays: z.coerce.number().int().min(1).max(365).optional(),
  lines: z.array(line).min(1).max(50).optional(),
  paymentTerms: z.string().trim().max(2_000).optional(),
  discountCode: z.union([z.null(), z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/)]).optional(),
}).refine((input) => Object.keys(input).length > 0, { message: 'Provide quotation terms or validity to update.' });
export const listQuotationQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CONVERTED']).optional(), search: z.string().trim().max(100).optional() });
export const resourceParamsSchema = z.object({ id: objectId });
export const transitionSchema = z.object({ reason: z.string().trim().max(1_000).optional() });
