import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const accessTokenLifetime = '15m';
const refreshTokenLifetime = '7d';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, config.jwtAccessSecret, { expiresIn: accessTokenLifetime, issuer: 'brightloop-api', audience: 'brightloop-web' });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, config.jwtRefreshSecret, { expiresIn: refreshTokenLifetime, issuer: 'brightloop-api', audience: 'brightloop-web' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret, { issuer: 'brightloop-api', audience: 'brightloop-web' });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret, { issuer: 'brightloop-api', audience: 'brightloop-web' });
}

export function createOpaqueToken() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: hashOpaqueToken(token) };
}

export function hashOpaqueToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
