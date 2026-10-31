import { describe, expect, it } from 'vitest';
import { customerListFilter, customerResourceFilter } from '../src/services/customer.service.js';

describe('customer resource ownership', () => {
  it('scopes customer list requests to the signed-in email', () => {
    expect(customerListFilter({}, { role: 'CUSTOMER', email: 'mine@example.com' })).toEqual({ email: 'mine@example.com' });
  });

  it('scopes customer detail requests to the signed-in email', () => {
    expect(customerResourceFilter('507f1f77bcf86cd799439011', { role: 'CUSTOMER', email: 'mine@example.com' })).toEqual({ _id: '507f1f77bcf86cd799439011', email: 'mine@example.com' });
  });

  it('keeps staff access unscoped while filtering search safely', () => {
    expect(customerResourceFilter('507f1f77bcf86cd799439011', { role: 'STAFF' })).toEqual({ _id: '507f1f77bcf86cd799439011' });
    expect(customerListFilter({ search: 'a.*b' }, { role: 'STAFF' }).$or[0].fullName.$regex).toBe('a\\.\\*b');
  });
});
