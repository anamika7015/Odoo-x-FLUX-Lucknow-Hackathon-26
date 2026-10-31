import { randomBytes } from 'node:crypto';
import { config } from '../config/env.js';
import { createStaff, login, loginDemo, logout, refreshSession, registerCustomer, requestPasswordReset, resetPassword } from '../services/auth.service.js';

const accessCookie = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' };
const refreshCookie = { httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/v1/auth' };
const csrfCookie = { httpOnly: false, secure: config.cookieSecure, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };

function setSessionCookies(response, session) {
  response.cookie('access_token', session.accessToken, accessCookie);
  response.cookie('refresh_token', session.refreshToken, refreshCookie);
}
function clearSessionCookies(response) {
  response.clearCookie('access_token', { ...accessCookie, maxAge: undefined });
  response.clearCookie('refresh_token', { ...refreshCookie, maxAge: undefined });
}

export async function register(request, response) {
  const session = await registerCustomer(request.body);
  setSessionCookies(response, session);
  response.status(201).json({ success: true, data: { user: session.user }, requestId: request.id });
}
export async function loginUser(request, response) {
  const session = await login(request.body);
  setSessionCookies(response, session);
  response.status(200).json({ success: true, data: { user: session.user }, requestId: request.id });
}
export function demoConfig(request, response) {
  response.json({
    success: true,
    data: {
      roles: {
        ADMIN: Boolean(config.demo.admin),
        STAFF: Boolean(config.demo.staff),
        CUSTOMER: Boolean(config.demo.customer),
      },
    },
    requestId: request.id,
  });
}
export async function demoLoginUser(request, response) {
  const session = await loginDemo(request.body.role);
  setSessionCookies(response, session);
  response.status(200).json({ success: true, data: { user: session.user }, requestId: request.id });
}
export async function refresh(request, response) {
  const session = await refreshSession(request.cookies.refresh_token);
  setSessionCookies(response, session);
  response.status(200).json({ success: true, data: { user: session.user }, requestId: request.id });
}
export async function logoutUser(request, response) {
  await logout(request.cookies.refresh_token);
  clearSessionCookies(response);
  response.status(204).send();
}
export function csrf(request, response) {
  const token = randomBytes(32).toString('hex');
  response.cookie('csrf_token', token, csrfCookie);
  response.status(200).json({ success: true, data: { csrfToken: token }, requestId: request.id });
}
export async function forgotPassword(request, response) {
  await requestPasswordReset(request.body.email);
  response.status(202).json({ success: true, data: { message: 'If an active account exists, a password-reset email has been sent.' }, requestId: request.id });
}
export async function resetPasswordUser(request, response) {
  await resetPassword(request.body);
  clearSessionCookies(response);
  response.status(200).json({ success: true, data: { message: 'Your password has been reset. Please sign in.' }, requestId: request.id });
}
export function me(request, response) {
  response.status(200).json({ success: true, data: { user: { id: request.user.id, fullName: request.user.fullName, email: request.user.email, role: request.user.role, status: request.user.status } }, requestId: request.id });
}
export async function createStaffUser(request, response) {
  const user = await createStaff(request.body, request.user._id);
  response.status(201).json({ success: true, data: { user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status } }, requestId: request.id });
}
