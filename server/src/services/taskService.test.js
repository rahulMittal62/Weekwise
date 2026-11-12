import { describe, expect, it } from 'vitest';
import { buildTaskFilter, escapeRegex, toTaskDto, validateTaskInput } from './taskService.js';

describe('validateTaskInput', () => {
  it('requires a title and a valid date for new tasks', () => {
    expect(validateTaskInput({})).toMatchObject({
      title: expect.any(String),
      dueAt: expect.any(String),
    });
  });

  it('accepts a valid task and rejects unsupported priority values', () => {
    const valid = { title: 'Read chapter 2', dueAt: '2026-11-12T10:00:00.000Z', priority: 'high' };
    expect(validateTaskInput(valid)).toEqual({});
    expect(validateTaskInput({ ...valid, priority: 'urgent' })).toHaveProperty('priority');
  });

  it('validates only provided fields for a partial update', () => {
    expect(validateTaskInput({ status: 'completed' }, { partial: true })).toEqual({});
    expect(validateTaskInput({ status: 'blocked' }, { partial: true })).toHaveProperty('status');
    expect(validateTaskInput(null, { partial: true })).toHaveProperty('body');
    expect(validateTaskInput({ owner: 'someone' }, { partial: true })).toHaveProperty('owner');
    expect(validateTaskInput({}, { partial: true })).toHaveProperty('body');
  });
});

describe('task query helpers', () => {
  it('escapes regular expression syntax in search input', () => {
    expect(escapeRegex('plan (v2)')).toBe('plan \\(v2\\)');
  });

  it('creates a case-insensitive title and description search with date bounds', () => {
    const filter = buildTaskFilter({
      search: '  report  ',
      from: '2026-11-09T00:00:00.000Z',
      to: '2026-11-16T00:00:00.000Z',
    });
    expect(filter.$or).toHaveLength(2);
    expect(filter.$or[0].title.test('Weekly Report')).toBe(true);
    expect(filter.dueAt.$gte.toISOString()).toBe('2026-11-09T00:00:00.000Z');
    expect(filter.dueAt.$lt.toISOString()).toBe('2026-11-16T00:00:00.000Z');
  });

  it('returns a stable API shape from a database record', () => {
    const dto = toTaskDto({
      _id: 'abc',
      title: 'Plan',
      dueAt: '2026-11-12T10:00:00Z',
      priority: 'low',
      status: 'in_progress',
    });
    expect(dto).toMatchObject({
      id: 'abc',
      title: 'Plan',
      description: '',
      priority: 'low',
      status: 'in_progress',
    });
    expect(dto.dueAt).toBe('2026-11-12T10:00:00.000Z');
  });
});
