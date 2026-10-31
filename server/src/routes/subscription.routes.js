import { Router } from 'express';
import * as controller from '../controllers/subscription.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { resourceParamsSchema, transitionSchema } from '../validators/quotation.validator.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);
router.get('/', validateQuery(z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED']).optional() })), asyncHandler(controller.listSubscriptions));
router.get('/:id', validateParams(resourceParamsSchema), asyncHandler(controller.getSubscription));
router.post('/:id/:action', requireCsrf, validateParams(resourceParamsSchema.extend({ action: z.enum(['activate', 'pause', 'resume', 'close', 'renew']) })), validateBody(transitionSchema), asyncHandler(controller.transitionSubscription));
export default router;
