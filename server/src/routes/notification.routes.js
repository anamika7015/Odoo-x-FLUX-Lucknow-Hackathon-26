import { Router } from 'express';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateParams } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { notificationParamsSchema } from '../validators/notification.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', asyncHandler(listNotifications));
router.post('/read-all', requireCsrf, asyncHandler(markAllNotificationsRead));
router.patch('/:notificationId/read', requireCsrf, validateParams(notificationParamsSchema), asyncHandler(markNotificationRead));
export default router;
