import { Task } from '../models/Task.js';

export const mongoTaskRepository = {
  list: (filter) => Task.find(filter).sort({ dueAt: 1, createdAt: -1 }).lean(),
  findById: (id) => Task.findById(id),
  create: (input) => Task.create(input),
  update: (id, input) => Task.findByIdAndUpdate(id, input, { new: true, runValidators: true }),
  remove: (id) => Task.findByIdAndDelete(id),
};
