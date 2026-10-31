import { AppError } from '../utils/app-error.js';

export function validateBody(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) return next(new AppError('Request validation failed.', { statusCode: 422, code: 'VALIDATION_ERROR', details: result.error.flatten() }));
    request.body = result.data;
    return next();
  };
}

export function validateParams(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) return next(new AppError('Route validation failed.', { statusCode: 422, code: 'VALIDATION_ERROR', details: result.error.flatten() }));
    request.params = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.query);
    if (!result.success) return next(new AppError('Query validation failed.', { statusCode: 422, code: 'VALIDATION_ERROR', details: result.error.flatten() }));
    request.query = result.data;
    return next();
  };
}
