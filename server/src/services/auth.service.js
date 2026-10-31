import { hashOpaqueToken, createOpaqueToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { AppError } from '../utils/app-error.js';
import { User, roles } from '../models/user.model.js';
import { sendPasswordResetEmail } from './email.service.js';
import { config } from '../config/env.js';

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt };
}

async function establishSession(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashOpaqueToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();
  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function registerCustomer({ fullName, email, password }) {
  const exists = await User.exists({ email });
  if (exists) throw new AppError('An account with this email already exists.', { statusCode: 409, code: 'EMAIL_IN_USE' });
  const user = await User.create({ fullName, email, passwordHash: await hashPassword(password), role: roles.CUSTOMER });
  return establishSession(user);
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');
  if (!user || !(await comparePassword(password, user.passwordHash))) throw new AppError('Invalid email or password.', { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  if (user.status !== 'ACTIVE') throw new AppError('Your account is unavailable.', { statusCode: 403, code: 'ACCOUNT_UNAVAILABLE' });
  return establishSession(user);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new AppError('Refresh token is required.', { statusCode: 401, code: 'INVALID_SESSION' });
  let payload;
  try { payload = verifyRefreshToken(refreshToken); } catch { throw new AppError('Your session is invalid or expired.', { statusCode: 401, code: 'INVALID_SESSION' }); }
  if (payload.type !== 'refresh') throw new AppError('Your session is invalid.', { statusCode: 401, code: 'INVALID_SESSION' });
  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || user.status !== 'ACTIVE' || !user.refreshTokenHash || user.refreshTokenHash !== hashOpaqueToken(refreshToken)) throw new AppError('Your session is invalid or expired.', { statusCode: 401, code: 'INVALID_SESSION' });
  return establishSession(user);
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await User.findByIdAndUpdate(payload.sub, { $unset: { refreshTokenHash: 1 } });
  } catch {
    // Logout is intentionally idempotent: invalid cookies are simply cleared.
  }
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user || user.status !== 'ACTIVE') return;
  const { token, hash } = createOpaqueToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();
  const resetUrl = new URL('/reset-password', config.allowedOrigins[0]);
  resetUrl.searchParams.set('token', token);
  await sendPasswordResetEmail({ to: user.email, fullName: user.fullName, resetUrl: resetUrl.toString() });
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({ passwordResetTokenHash: hashOpaqueToken(token), passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpiresAt +refreshTokenHash');
  if (!user) throw new AppError('This password reset link is invalid or has expired.', { statusCode: 400, code: 'INVALID_RESET_TOKEN' });
  user.passwordHash = await hashPassword(password);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = undefined;
  await user.save();
}

export async function createStaff({ fullName, email, password }) {
  const exists = await User.exists({ email });
  if (exists) throw new AppError('An account with this email already exists.', { statusCode: 409, code: 'EMAIL_IN_USE' });
  return User.create({ fullName, email, passwordHash: await hashPassword(password), role: roles.STAFF });
}
