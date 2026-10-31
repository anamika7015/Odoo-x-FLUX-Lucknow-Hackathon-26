import { z } from 'zod';
import { paymentMethods } from '../models/payment.model.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
export const createPaymentSchema = z.object({
  invoice: objectId,
  amount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  method: z.enum(Object.values(paymentMethods)),
  paymentDate: z.coerce.date().optional(),
  paymentReference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1_000).optional(),
});
export const updatePaymentSchema = z.object({
  method: z.enum(Object.values(paymentMethods)).optional(),
  paymentDate: z.coerce.date().optional(),
  paymentReference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1_000).optional(),
}).refine((input) => Object.keys(input).length > 0, 'Provide at least one payment detail to update.');
export const paymentParamsSchema = z.object({ paymentId: objectId });
export const listPaymentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  invoice: objectId.optional(), method: z.enum(Object.values(paymentMethods)).optional(),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(),
}).refine(({ from, to }) => !from || !to || from <= to, { message: 'Start date must not be after end date.', path: ['to'] });
