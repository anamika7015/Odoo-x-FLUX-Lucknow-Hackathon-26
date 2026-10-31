import { User } from '../models/user.model.js';
import { Customer } from '../models/customer.model.js';
import { AppError } from '../utils/app-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const requireAuth = asyncHandler(async (request, response, next) => {
  const token = request.cookies.access_token;
  if (!token) throw new AppError('Authentication is required.', { statusCode: 401, code: 'UNAUTHENTICATED' });
  let payload;
  try { payload = verifyAccessToken(token); } catch { throw new AppError('Your session is invalid or expired.', { statusCode: 401, code: 'INVALID_SESSION' }); }
  if (payload.type !== 'access') throw new AppError('Your session is invalid.', { statusCode: 401, code: 'INVALID_SESSION' });
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'ACTIVE') throw new AppError('Your account is unavailable.', { statusCode: 401, code: 'ACCOUNT_UNAVAILABLE' });
  if (user.role === 'CUSTOMER' && !await Customer.exists({ email: user.email, status: 'ACTIVE' })) throw new AppError('Your customer account is inactive.', { statusCode: 403, code: 'CUSTOMER_ACCOUNT_INACTIVE' });
  request.user = user;
  next();
});

export function requireRoles(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) return next(new AppError('You do not have permission to perform this action.', { statusCode: 403, code: 'FORBIDDEN' }));
    return next();
  };
}
