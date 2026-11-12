import { Router } from 'express';
import mongoose from 'mongoose';
import { buildTaskFilter, toTaskDto, validateTaskInput } from '../services/taskService.js';

export function createTaskRouter(repository) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tasks = await repository.list(buildTaskFilter(req.query));
      res.json({ data: tasks.map(toTaskDto) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const errors = validateTaskInput(req.body);
      if (Object.keys(errors).length)
        return res.status(400).json({ error: 'Validation failed', fields: errors });
      const task = await repository.create({
        title: req.body.title.trim(),
        description: (req.body.description ?? '').trim(),
        dueAt: new Date(req.body.dueAt),
        priority: req.body.priority ?? 'medium',
        status: req.body.status ?? 'in_progress',
      });
      return res.status(201).json({ data: toTaskDto(task) });
    } catch (error) {
      return next(error);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: 'Task not found.' });
      const errors = validateTaskInput(req.body, { partial: true });
      if (Object.keys(errors).length)
        return res.status(400).json({ error: 'Validation failed', fields: errors });
      const updates = { ...req.body };
      if (updates.title !== undefined) updates.title = updates.title.trim();
      if (updates.description !== undefined) updates.description = updates.description.trim();
      if (updates.dueAt !== undefined) updates.dueAt = new Date(updates.dueAt);
      const task = await repository.update(req.params.id, updates);
      if (!task) return res.status(404).json({ error: 'Task not found.' });
      return res.json({ data: toTaskDto(task) });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return res.status(404).json({ error: 'Task not found.' });
      const task = await repository.remove(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found.' });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
