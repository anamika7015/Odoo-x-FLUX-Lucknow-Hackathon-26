import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createStaffUser, csrf, demoConfig, demoLoginUser, forgotPassword, loginUser, logoutUser, me, refresh, register, resetPasswordUser } from '../controllers/auth.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { demoLoginSchema, emailSchema, loginSchema, registerSchema, resetPasswordSchema } from '../validators/auth.validator.js';
import { roles } from '../models/user.model.js';

const router = Router();
const sensitiveLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, handler: (request, response) => response.status(429).json({ success: false, error: { code: 'AUTH_RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' }, requestId: request.id }) });

router.get('/csrf', csrf);
router.get('/demo-config', demoConfig);
router.post('/demo-login', sensitiveLimit, validateBody(demoLoginSchema), asyncHandler(demoLoginUser));
router.post('/register', sensitiveLimit, validateBody(registerSchema), asyncHandler(register));
router.post('/login', sensitiveLimit, validateBody(loginSchema), asyncHandler(loginUser));
router.post('/refresh', sensitiveLimit, requireCsrf, asyncHandler(refresh));
router.post('/logout', requireCsrf, asyncHandler(logoutUser));
router.post('/forgot-password', sensitiveLimit, validateBody(emailSchema), asyncHandler(forgotPassword));
router.post('/reset-password', sensitiveLimit, validateBody(resetPasswordSchema), asyncHandler(resetPasswordUser));
router.get('/me', requireAuth, me);
router.post('/staff', requireAuth, requireRoles(roles.ADMIN), requireCsrf, validateBody(registerSchema), asyncHandler(createStaffUser));

export default router;
