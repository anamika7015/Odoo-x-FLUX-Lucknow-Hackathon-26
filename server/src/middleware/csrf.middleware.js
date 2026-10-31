import { timingSafeEqual } from 'node:crypto';
import { AppError } from '../utils/app-error.js';

export function requireCsrf(request, response, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
  const cookie = request.cookies.csrf_token;
  const header = request.get('X-CSRF-Token');
  if (!cookie || !header || cookie.length !== header.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new AppError('Invalid CSRF token.', { statusCode: 403, code: 'CSRF_INVALID' }));
  }
  return next();
}
