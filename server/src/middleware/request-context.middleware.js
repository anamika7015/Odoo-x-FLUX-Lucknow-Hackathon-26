import { randomUUID } from 'node:crypto';

export function requestContext(request, response, next) {
  request.id = request.get('X-Request-Id') || randomUUID();
  response.setHeader('X-Request-Id', request.id);
  next();
}
