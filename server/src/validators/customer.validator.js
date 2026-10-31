import { z } from 'zod';

export const createCustomerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  billingAddress: z.string().optional(),
  taxId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const customerParamsSchema = z.object({
  customerId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid identifier.'),
});
