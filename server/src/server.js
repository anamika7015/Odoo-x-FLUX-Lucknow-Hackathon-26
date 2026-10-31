import { createServer } from 'node:http';
import { app } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const server = createServer(app);

async function start() {
  await connectDatabase();
  server.listen(config.port, () => {
    logger.info('HTTP server listening', { port: config.port, environment: config.nodeEnv });
  });
}

async function stop(signal) {
  logger.info('Shutdown signal received', { signal });
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));

start().catch((error) => {
  logger.error('Application startup failed', { error });
  process.exit(1);
});
