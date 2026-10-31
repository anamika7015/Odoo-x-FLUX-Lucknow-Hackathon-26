import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  mongoose.connection.on('error', (error) => logger.error('MongoDB connection error', { error }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5_000,
    maxPoolSize: 20,
    minPoolSize: 2,
  });
  logger.info('MongoDB connected', { host: mongoose.connection.host, database: mongoose.connection.name });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

export function databaseIsReady() {
  return mongoose.connection.readyState === 1;
}
