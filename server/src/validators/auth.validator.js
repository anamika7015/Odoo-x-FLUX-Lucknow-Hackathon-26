import { z } from 'zod';
import { passwordPattern } from '../utils/password.js';

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(9, 'Password must be at least 9 characters.').max(128).regex(passwordPattern, 'Password must contain uppercase, lowercase, and special characters.');

export const registerSchema = z.object({ fullName: z.string().trim().min(2).max(120), email, password, confirmPassword: z.string() }).superRefine(({ password: value, confirmPassword }, context) => {
  if (value !== confirmPassword) context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
});
export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const emailSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password, confirmPassword: z.string() }).superRefine(({ password: value, confirmPassword }, context) => {
  if (value !== confirmPassword) context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match.' });
});
