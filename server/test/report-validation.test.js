import { describe, expect, it } from 'vitest';
import { reportQuerySchema } from '../src/validators/report.validator.js';

describe('report query validation', () => {
  it('parses a valid custom range into dates', () => {
    const result = reportQuerySchema.safeParse({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.999Z' });
    expect(result.success).toBe(true);
    expect(result.data.from).toBeInstanceOf(Date);
  });

  it('rejects reversed or overlong ranges', () => {
    expect(reportQuerySchema.safeParse({ from: '2026-02-01T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ from: '2020-01-01T00:00:00.000Z', to: '2024-01-01T00:00:00.000Z' }).success).toBe(false);
  });
});
