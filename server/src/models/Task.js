import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    dueAt: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  },
  { timestamps: true },
);

taskSchema.index({ dueAt: 1, status: 1 });

export const Task = mongoose.model('Task', taskSchema);
