import { Router } from 'express';
import * as controller from '../controllers/invoice.controller.js';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { requireCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { roles } from '../models/user.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createInvoiceSchema, invoiceActionSchema, invoiceParamsSchema, listInvoiceQuerySchema } from '../validators/invoice.validator.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth);
router.get('/', validateQuery(listInvoiceQuerySchema), asyncHandler(controller.listInvoices));
router.post('/from-subscription', requireRoles(roles.ADMIN, roles.STAFF), requireCsrf, validateBody(createInvoiceSchema), asyncHandler(controller.createInvoice));
router.get('/:invoiceId/pdf', validateParams(invoiceParamsSchema), asyncHandler(controller.downloadInvoicePdf));
router.get('/:invoiceId', validateParams(invoiceParamsSchema), asyncHandler(controller.getInvoice));
router.post('/:invoiceId/:action', requireRoles(roles.ADMIN, roles.STAFF), requireCsrf, validateParams(invoiceParamsSchema.extend({ action: z.enum(['confirm', 'cancel']) })), validateBody(invoiceActionSchema), asyncHandler(controller.transitionInvoice));
export default router;
