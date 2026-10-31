import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('API foundation', () => {
  it('reports that the process is live without requiring a database connection', async () => {
    const response = await request(app).get('/api/v1/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'ok', service: 'brightloop-api' } });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns the standard error envelope for missing routes', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.requestId).toBeTruthy();
  });

  it('reports readiness as unavailable before a database connects', async () => {
    const response = await request(app).get('/api/v1/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.data.dependencies.database).toBe('disconnected');
  });

  it('issues a CSRF token before state-changing cookie operations', async () => {
    const response = await request(app).get('/api/v1/auth/csrf');
    expect(response.status).toBe(200);
    expect(response.body.data.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers['set-cookie'][0]).toContain('csrf_token=');
  });

  it('rejects a logout request without a matching CSRF token', async () => {
    const response = await request(app).post('/api/v1/auth/logout');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_INVALID');
  });

  it('does not expose catalog data to anonymous requests', async () => {
    const response = await request(app).get('/api/v1/products');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
