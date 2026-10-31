import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestContext } from './middleware/request-context.middleware.js';
import apiRouter from './routes/index.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.isProduction ? 1 : false);
app.use(requestContext);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token'],
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (request) => request.path === '/v1/health/live' || request.path === '/v1/health/ready',
  handler: (request, response) => response.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
    requestId: request.id,
  }),
}));
app.use('/api/v1', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
