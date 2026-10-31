import { z } from 'zod';
import { roles } from '../models/user.model.js';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/);
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum(Object.values(roles)).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export const userParamsSchema = z.object({ userId: objectId });
export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(Object.values(roles)).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
