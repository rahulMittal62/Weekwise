import express from 'express';
import cors from 'cors';
import { createTaskRouter } from './routes/tasks.js';
import { mongoTaskRepository } from './repositories/mongoTaskRepository.js';

export function createApp({
  repository = mongoTaskRepository,
  clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
} = {}) {
  const app = express();
  const allowedOrigin = /^https?:\/\//i.test(clientOrigin)
    ? clientOrigin
    : `https://${clientOrigin}`;
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/tasks', createTaskRouter(repository));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, _req, res, _next) => {
    if (error?.name === 'ValidationError' || error?.name === 'CastError')
      return res.status(400).json({ error: 'Invalid task data.' });
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
