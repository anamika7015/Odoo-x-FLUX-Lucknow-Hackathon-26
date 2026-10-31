import { Router } from 'express';
import { getUsers, patchUser } from '../controllers/user.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { listUsersQuerySchema, updateUserSchema, userParamsSchema } from '../validators/user.validator.js';

const router = Router();
router.use(requireAuth, requireRoles(roles.ADMIN));
router.get('/', validateQuery(listUsersQuerySchema), asyncHandler(getUsers));
router.patch('/:userId', requireCsrf, validateParams(userParamsSchema), validateBody(updateUserSchema), asyncHandler(patchUser));
export default router;
