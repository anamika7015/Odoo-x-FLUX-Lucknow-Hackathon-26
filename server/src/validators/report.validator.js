import { z } from 'zod';

const date = z.string().datetime({ offset: true }).transform((value) => new Date(value));
export const reportQuerySchema = z.object({ from: date.optional(), to: date.optional() }).superRefine(({ from, to }, context) => {
  if (from && to && from > to) context.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'Start date must be before end date.' });
  if (from && to && to.getTime() - from.getTime() > 731 * 24 * 60 * 60 * 1000) context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Report date range cannot exceed two years.' });
});
