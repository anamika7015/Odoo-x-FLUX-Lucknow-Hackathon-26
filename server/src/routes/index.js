import { Router } from 'express';
import healthRouter from './health.routes.js';
import authRouter from './auth.routes.js';
import productRouter from './product.routes.js';
import customerRouter from './customer.routes.js';
import planRouter from './plan.routes.js';

const router = Router();
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/products', productRouter);
router.use('/customers', customerRouter);
router.use('/plans', planRouter);

export default router;
