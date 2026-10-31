import { Router } from 'express';
import * as controller from '../controllers/customer.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createCustomerSchema, customerParamsSchema, listCustomersQuerySchema, updateCustomerSchema, updateOwnCustomerSchema } from '../validators/customer.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', validateQuery(listCustomersQuerySchema), asyncHandler(controller.listCustomersController));
router.post('/', requireRoles(roles.ADMIN, roles.STAFF), requireCsrf, validateBody(createCustomerSchema), asyncHandler(controller.createCustomerController));
router.get('/me', requireRoles(roles.CUSTOMER), asyncHandler(controller.getOwnCustomerController));
router.patch('/me', requireRoles(roles.CUSTOMER), requireCsrf, validateBody(updateOwnCustomerSchema), asyncHandler(controller.updateOwnCustomerController));
router.get('/:customerId/history', validateParams(customerParamsSchema), asyncHandler(controller.getCustomerHistoryController));
router.get('/:customerId', validateParams(customerParamsSchema), asyncHandler(controller.getCustomerController));
router.patch('/:customerId', requireRoles(roles.ADMIN, roles.STAFF), requireCsrf, validateParams(customerParamsSchema), validateBody(updateCustomerSchema), asyncHandler(controller.updateCustomerController));
export default router;
