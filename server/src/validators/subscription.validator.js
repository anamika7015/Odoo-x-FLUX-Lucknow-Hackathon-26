import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
export const updateConfirmedSubscriptionSchema = z.object({
  lines: z.array(z.object({ quantity: z.coerce.number().int().min(1) })).min(1).max(50).optional(),
  paymentTerms: z.string().trim().max(2_000).optional(),
}).refine((input) => Object.keys(input).length > 0, 'Provide subscription details to update.');
export const subscriptionParamsSchema = z.object({ id: objectId });
