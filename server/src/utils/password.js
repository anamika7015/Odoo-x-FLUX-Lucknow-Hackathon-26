import bcrypt from 'bcryptjs';

export const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
