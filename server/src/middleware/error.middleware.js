import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(request, response) {
  response.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.originalUrl} was not found.` },
    requestId: request.id,
  });
}

export function errorHandler(error, request, response, next) { // eslint-disable-line no-unused-vars
  const duplicateKey = error?.code === 11000;
  const statusCode = error instanceof AppError ? error.statusCode : duplicateKey ? 409 : 500;
  const code = error instanceof AppError ? error.code : duplicateKey ? 'DUPLICATE_RESOURCE' : 'INTERNAL_ERROR';
  const message = error instanceof AppError ? error.message : duplicateKey ? 'A record with these values already exists.' : 'An unexpected error occurred.';
  const context = { requestId: request.id, method: request.method, path: request.originalUrl, error };
  if (statusCode >= 500) logger.error('Request failed', context);
  else logger.warn('Request rejected', { ...context, code });
  response.status(statusCode).json({ success: false, error: { code, message, ...(error.details ? { details: error.details } : {}) }, requestId: request.id });
}
