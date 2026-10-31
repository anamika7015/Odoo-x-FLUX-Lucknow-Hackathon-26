import { describe, expect, it } from 'vitest';
import { registerSchema, resetPasswordSchema } from '../src/validators/auth.validator.js';

describe('authentication validation', () => {
  const validPassword = 'Asecure!password1';

  it('accepts a strong matching registration password and normalizes email', () => {
    const result = registerSchema.safeParse({ fullName: 'Ada Lovelace', email: 'ADA@EXAMPLE.COM', password: validPassword, confirmPassword: validPassword });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('ada@example.com');

    // Minimum 8 characters with upper, lower, special, number
    const eightCharPassword = 'Pass!123';
    const eightCharResult = registerSchema.safeParse({ fullName: 'Ada Lovelace', email: 'ada8@example.com', password: eightCharPassword, confirmPassword: eightCharPassword });
    expect(eightCharResult.success).toBe(true);
  });

  it('rejects weak or mismatched passwords', () => {
    expect(registerSchema.safeParse({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'password', confirmPassword: 'password' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 'a'.repeat(64), password: validPassword, confirmPassword: 'Other!password1' }).success).toBe(false);
  });
});
