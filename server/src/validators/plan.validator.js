import { z } from 'zod';
import { billingFrequencies, planStatuses } from '../models/plan.model.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.');
const money = z.coerce.number().int().nonnegative('Amounts must be non-negative integer paise.');
const date = z.coerce.date();
const optionalDate = z.union([date, z.null()]).optional();

const planFields = z.object({
  name: z.string().trim().min(2).max(160), product: objectId, description: z.string().trim().max(4_000).optional(), billingPrice: money,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('INR'), billingFrequency: z.enum(Object.values(billingFrequencies)),
  minimumQuantity: z.coerce.number().int().min(1).default(1), availabilityStartDate: optionalDate, availabilityEndDate: optionalDate,
  autoClose: z.boolean().optional(), allowEarlyClosure: z.boolean().optional(), allowPause: z.boolean().optional(), allowRenewal: z.boolean().optional(), status: z.enum(Object.values(planStatuses)).optional(),
});
const basePlan = planFields.superRefine(({ availabilityStartDate, availabilityEndDate }, context) => {
  if (availabilityStartDate && availabilityEndDate && availabilityEndDate < availabilityStartDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ['availabilityEndDate'], message: 'Availability end date must not precede start date.' });
});

export const createPlanSchema = basePlan;
export const updatePlanSchema = planFields.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
export const planParamsSchema = z.object({ planId: objectId });
export const listPlansQuerySchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), product: objectId.optional(), status: z.enum(Object.values(planStatuses)).optional(), billingFrequency: z.enum(Object.values(billingFrequencies)).optional(), search: z.string().trim().max(100).optional() });
