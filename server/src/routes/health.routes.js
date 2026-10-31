import { Router } from 'express';
import { databaseIsReady } from '../config/database.js';

const router = Router();

router.get('/live', (request, response) => {
  response.status(200).json({
    success: true,
    data: { status: 'ok', service: 'brightloop-api' },
    requestId: request.id,
  });
});

router.get('/ready', (request, response) => {
  const ready = databaseIsReady();
  response.status(ready ? 200 : 503).json({
    success: ready,
    data: { status: ready ? 'ready' : 'not_ready', dependencies: { database: ready ? 'connected' : 'disconnected' } },
    requestId: request.id,
  });
});

export default router;
