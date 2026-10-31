import { Router } from 'express';
import * as controller from '../controllers/payment.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createPaymentSchema, listPaymentQuerySchema, paymentParamsSchema, updatePaymentSchema } from '../validators/payment.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', validateQuery(listPaymentQuerySchema), asyncHandler(controller.listPayments));
router.post('/', requireRoles(roles.ADMIN, roles.STAFF), requireCsrf, validateBody(createPaymentSchema), asyncHandler(controller.recordPayment));
router.get('/:paymentId', validateParams(paymentParamsSchema), asyncHandler(controller.getPayment));
router.patch('/:paymentId', requireRoles(roles.ADMIN, roles.STAFF), requireCsrf, validateParams(paymentParamsSchema), validateBody(updatePaymentSchema), asyncHandler(controller.updatePayment));
export default router;
