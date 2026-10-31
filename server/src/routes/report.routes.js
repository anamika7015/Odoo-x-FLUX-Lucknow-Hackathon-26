import { Router } from 'express';
import { dashboard } from '../controllers/report.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { reportQuerySchema } from '../validators/report.validator.js';

const router = Router();
router.use(requireAuth, requireRoles(roles.ADMIN, roles.STAFF));
router.get('/dashboard', validateQuery(reportQuerySchema), asyncHandler(dashboard));
export default router;
