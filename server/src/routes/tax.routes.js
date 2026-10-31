import { Router } from 'express';
import * as controller from '../controllers/tax.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createTaxSchema, listTaxQuerySchema, taxParamsSchema, updateTaxSchema } from '../validators/tax.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', validateQuery(listTaxQuerySchema), asyncHandler(controller.listTaxes));
router.post('/', requireRoles(roles.ADMIN), requireCsrf, validateBody(createTaxSchema), asyncHandler(controller.createTax));
router.patch('/:taxId', requireRoles(roles.ADMIN), requireCsrf, validateParams(taxParamsSchema), validateBody(updateTaxSchema), asyncHandler(controller.updateTax));
export default router;
