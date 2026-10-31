import { hashOpaqueToken, createOpaqueToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { AppError } from '../utils/app-error.js';
import { User, roles } from '../models/user.model.js';
import { Customer } from '../models/customer.model.js';
import { sendPasswordResetEmail } from './email.service.js';
import { config } from '../config/env.js';
import mongoose from 'mongoose';
import { AuditLog } from '../models/audit-log.model.js';
import { trustedFilter } from '../utils/trusted-filter.js';

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
  const passwordHash = await hashPassword(password);
  let user;
  let createdCustomer;
  try {
    user = await User.create({ fullName, email, passwordHash, role: roles.CUSTOMER });
    // Older installations may already have a Customer record for an email
    // before that customer creates a portal login. Keep that record and only
    // create a profile when one does not exist yet.
    const existingCustomer = await Customer.exists({ email });
    if (!existingCustomer) createdCustomer = await Customer.create({ fullName, email, createdBy: user._id });
    return await establishSession(user);
  } catch (error) {
    await Promise.allSettled([
      ...(createdCustomer?._id ? [Customer.deleteOne({ _id: createdCustomer._id })] : []),
      ...(user?._id ? [User.deleteOne({ _id: user._id })] : []),
    ]);
    throw error;
  }
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');
  if (!user || !(await comparePassword(password, user.passwordHash))) throw new AppError('Invalid email or password.', { statusCode: 401, code: 'INVALID_CREDENTIALS' });
  if (user.status !== 'ACTIVE') throw new AppError('Your account is unavailable.', { statusCode: 403, code: 'ACCOUNT_UNAVAILABLE' });
  if (user.role === roles.CUSTOMER) {
    const customer = await Customer.findOneAndUpdate({ email: user.email }, { $setOnInsert: { fullName: user.fullName, email: user.email, createdBy: user._id } }, { upsert: true, new: true });
    if (customer.status !== 'ACTIVE') throw new AppError('Your customer account is inactive. Contact the workspace administrator.', { statusCode: 403, code: 'CUSTOMER_ACCOUNT_INACTIVE' });
  }
  return establishSession(user);
}

export async function loginDemo(role) {
  const account = role === roles.ADMIN ? config.demo.admin : role === roles.CUSTOMER ? config.demo.customer : undefined;
  if (!account) throw new AppError('Demo login is not configured. Set demo credentials and run the demo seed script.', { statusCode: 503, code: 'DEMO_LOGIN_NOT_CONFIGURED' });
  const user = await User.findOne({ email: account.email, role, status: 'ACTIVE', demoAccount: true }).select('+passwordHash');
  if (!user) throw new AppError('The configured demo account is not seeded. Run the demo seed script for this database.', { statusCode: 503, code: 'DEMO_ACCOUNT_NOT_SEEDED' });
  if (!(await comparePassword(account.password, user.passwordHash))) throw new AppError('The configured demo password differs from the seeded account. Rerun the demo seed script after updating the environment.', { statusCode: 503, code: 'DEMO_ACCOUNT_OUT_OF_SYNC' });
  if (role === roles.CUSTOMER) {
    const customer = await Customer.findOne({ email: user.email, demoAccount: true });
    if (!customer || customer.status !== 'ACTIVE') throw new AppError('The demo customer profile is missing or inactive. Rerun the demo seed script.', { statusCode: 503, code: 'DEMO_CUSTOMER_NOT_READY' });
  }
  return establishSession(user);
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new AppError('Refresh token is required.', { statusCode: 401, code: 'INVALID_SESSION' });
  let payload;
  try { payload = verifyRefreshToken(refreshToken); } catch { throw new AppError('Your session is invalid or expired.', { statusCode: 401, code: 'INVALID_SESSION' }); }
  if (payload.type !== 'refresh') throw new AppError('Your session is invalid.', { statusCode: 401, code: 'INVALID_SESSION' });
  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || user.status !== 'ACTIVE' || !user.refreshTokenHash || user.refreshTokenHash !== hashOpaqueToken(refreshToken)) throw new AppError('Your session is invalid or expired.', { statusCode: 401, code: 'INVALID_SESSION' });
  if (user.role === roles.CUSTOMER && !await Customer.exists({ email: user.email, status: 'ACTIVE' })) throw new AppError('Your customer account is inactive.', { statusCode: 403, code: 'CUSTOMER_ACCOUNT_INACTIVE' });
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
  const user = await User.findOne(trustedFilter({ passwordResetTokenHash: hashOpaqueToken(token), passwordResetExpiresAt: { $gt: new Date() } })).select('+passwordResetTokenHash +passwordResetExpiresAt +refreshTokenHash');
  if (!user) throw new AppError('This password reset link is invalid or has expired.', { statusCode: 400, code: 'INVALID_RESET_TOKEN' });
  user.passwordHash = await hashPassword(password);
  user.passwordChangedAt = new Date();
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = undefined;
  await user.save();
}

export async function createStaff({ fullName, email, password }, actorId) {
  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      const exists = await User.exists({ email }).session(session);
      if (exists) throw new AppError('An account with this email already exists.', { statusCode: 409, code: 'EMAIL_IN_USE' });
      [user] = await User.create([{ fullName, email, passwordHash: await hashPassword(password), role: roles.STAFF }], { session });
      await AuditLog.create([{ actor: actorId, action: 'STAFF_CREATED', entityType: 'User', entityId: user._id, details: { email: user.email, role: user.role } }], { session });
    });
  } finally { await session.endSession(); }
  return user;
}
