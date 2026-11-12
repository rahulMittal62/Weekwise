export const priorities = ['low', 'medium', 'high'];
export const statuses = ['in_progress', 'completed'];

export function validateTaskInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return { body: 'Provide a JSON object.' };
  const errors = {};
  const allowedFields = ['title', 'description', 'dueAt', 'priority', 'status'];
  for (const field of Object.keys(input)) {
    if (!allowedFields.includes(field)) errors[field] = 'This field cannot be changed.';
  }
  if (partial && Object.keys(input).length === 0)
    errors.body = 'Provide at least one field to update.';
  if (!partial || input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim())
      errors.title = 'A task title is required.';
    else if (input.title.trim().length > 120) errors.title = 'Use 120 characters or fewer.';
  }
  if (!partial || input.dueAt !== undefined) {
    if (!input.dueAt || Number.isNaN(new Date(input.dueAt).getTime()))
      errors.dueAt = 'Choose a valid date and time.';
  }
  if (
    input.description !== undefined &&
    (typeof input.description !== 'string' || input.description.length > 1000)
  ) {
    errors.description = 'Use 1,000 characters or fewer.';
  }
  if (input.priority !== undefined && !priorities.includes(input.priority))
    errors.priority = 'Choose low, medium, or high priority.';
  if (input.status !== undefined && !statuses.includes(input.status))
    errors.status = 'Choose in progress or completed.';
  return errors;
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTaskFilter({ search, from, to } = {}) {
  const filter = {};
  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }];
  }
  if (from || to) {
    filter.dueAt = {};
    if (from) filter.dueAt.$gte = new Date(from);
    if (to) filter.dueAt.$lt = new Date(to);
  }
  return filter;
}

export function toTaskDto(task) {
  const value = task.toObject ? task.toObject() : task;
  return {
    id: String(value._id ?? value.id),
    title: value.title,
    description: value.description ?? '',
    dueAt: new Date(value.dueAt).toISOString(),
    priority: value.priority,
    status: value.status,
    createdAt: value.createdAt ? new Date(value.createdAt).toISOString() : undefined,
    updatedAt: value.updatedAt ? new Date(value.updatedAt).toISOString() : undefined,
  };
}
