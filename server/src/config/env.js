import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const candidateEnvPaths = [
  path.resolve(currentDir, '../../.env'), // server/.env
  path.resolve(currentDir, '../../../.env'), // repository root .env
  path.resolve(process.cwd(), '.env'), // current working directory .env
];

for (const envPath of candidateEnvPaths) {
  dotenv.config({ path: envPath, override: false });
}

const booleanFromEnvironment = z.enum(['true', 'false']).transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/brightloop'),
  COOKIE_SECURE: booleanFromEnvironment.default('false'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-access-secret-change-before-production'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-refresh-secret-change-before-production'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('Brightloop Software <no-reply@example.com>'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const values = parsed.data;
const origins = values.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean);

if (values.NODE_ENV === 'production' && (!values.COOKIE_SECURE || origins.some((origin) => !origin.startsWith('https://')) || values.JWT_ACCESS_SECRET.length < 32 || values.JWT_REFRESH_SECRET.length < 32)) {
  throw new Error('Production requires secure cookies, HTTPS CLIENT_URL origins, and JWT secrets at least 32 characters long.');
}

export const config = Object.freeze({
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  mongoUri: values.MONGODB_URI,
  cookieSecure: values.COOKIE_SECURE,
  rateLimitMax: values.RATE_LIMIT_MAX,
  appTimezone: values.APP_TIMEZONE,
  allowedOrigins: origins,
  isProduction: values.NODE_ENV === 'production',
  isTest: values.NODE_ENV === 'test',
  jwtAccessSecret: values.JWT_ACCESS_SECRET,
  jwtRefreshSecret: values.JWT_REFRESH_SECRET,
  smtp: { host: values.SMTP_HOST, port: values.SMTP_PORT, user: values.SMTP_USER, password: values.SMTP_PASSWORD, from: values.SMTP_FROM },
});
