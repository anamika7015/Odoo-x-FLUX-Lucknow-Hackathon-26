import { describe, expect, it } from 'vitest';
import { listUsersQuerySchema, updateUserSchema } from '../src/validators/user.validator.js';

describe('user management validation', () => {
  it('applies pagination defaults and accepts allowed filters', () => {
    const result = listUsersQuerySchema.safeParse({ role: 'STAFF', status: 'ACTIVE' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ page: 1, limit: 20, role: 'STAFF', status: 'ACTIVE' });
  });

  it('rejects invalid role and empty updates', () => {
    expect(listUsersQuerySchema.safeParse({ role: 'OWNER' }).success).toBe(false);
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });
});
