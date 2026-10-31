import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
export const createInvoiceSchema = z.object({ subscription: objectId, periodStart: z.coerce.date(), dueDate: z.coerce.date().optional() });
export const invoiceParamsSchema = z.object({ invoiceId: objectId });
export const listInvoiceQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED', 'OVERDUE']).optional(), customer: objectId.optional(), subscription: objectId.optional() });
export const invoiceActionSchema = z.object({ reason: z.string().trim().max(1_000).optional() });
