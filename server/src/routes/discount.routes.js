import { Router } from 'express';
import * as controller from '../controllers/discount.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createDiscountSchema, discountParamsSchema, listDiscountQuerySchema, updateDiscountSchema } from '../validators/discount.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', requireRoles(roles.ADMIN, roles.STAFF), validateQuery(listDiscountQuerySchema), asyncHandler(controller.listDiscounts));
router.post('/', requireRoles(roles.ADMIN), requireCsrf, validateBody(createDiscountSchema), asyncHandler(controller.createDiscount));
router.patch('/:discountId', requireRoles(roles.ADMIN), requireCsrf, validateParams(discountParamsSchema), validateBody(updateDiscountSchema), asyncHandler(controller.updateDiscount));
export default router;
