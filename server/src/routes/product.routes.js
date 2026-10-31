import { Router } from 'express';
import * as controller from '../controllers/product.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createProductSchema, createVariantSchema, listProductsQuerySchema, productParamsSchema, updateProductSchema, updateVariantSchema, variantParamsSchema } from '../validators/product.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', requireRoles(roles.ADMIN, roles.STAFF), validateQuery(listProductsQuerySchema), asyncHandler(controller.listProducts));
router.post('/', requireRoles(roles.ADMIN), requireCsrf, validateBody(createProductSchema), asyncHandler(controller.createProduct));
router.get('/:productId', requireRoles(roles.ADMIN, roles.STAFF), validateParams(productParamsSchema), asyncHandler(controller.getProduct));
router.patch('/:productId', requireRoles(roles.ADMIN), requireCsrf, validateParams(productParamsSchema), validateBody(updateProductSchema), asyncHandler(controller.updateProduct));
router.get('/:productId/variants', requireRoles(roles.ADMIN, roles.STAFF), validateParams(productParamsSchema), asyncHandler(controller.listVariants));
router.post('/:productId/variants', requireRoles(roles.ADMIN), requireCsrf, validateParams(productParamsSchema), validateBody(createVariantSchema), asyncHandler(controller.createVariant));
router.patch('/:productId/variants/:variantId', requireRoles(roles.ADMIN), requireCsrf, validateParams(variantParamsSchema), validateBody(updateVariantSchema), asyncHandler(controller.updateVariant));
export default router;
