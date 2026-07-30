import { app } from './app.js';
import { config } from './config.js';
import { databaseFile } from './db/store.js';
import { logger } from './lib/logger.js';

const server = app.listen(config.PORT, () => logger.info({ port: config.PORT, databaseFile }, 'Coupon Center API started'));
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
