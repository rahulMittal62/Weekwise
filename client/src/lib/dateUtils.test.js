import { describe, expect, it } from 'vitest';
import { getWeekStart, groupTasksByWeek, weekKey } from './dateUtils.js';

describe('weekly date helpers', () => {
  it('starts a week on Monday for dates across the week', () => {
    expect(weekKey('2026-11-09T12:00:00')).toBe('2026-11-09');
    expect(weekKey('2026-11-15T12:00:00')).toBe('2026-11-09');
    expect(getWeekStart('2026-11-08T12:00:00').getDay()).toBe(1);
  });

  it('groups and orders tasks by their Monday start date', () => {
    const groups = groupTasksByWeek([
      { id: 'a', dueAt: '2026-11-10T10:00:00' },
      { id: 'b', dueAt: '2026-11-16T10:00:00' },
      { id: 'c', dueAt: '2026-11-13T10:00:00' },
    ]);
    expect(groups.map((group) => group.key)).toEqual(['2026-11-16', '2026-11-09']);
    expect(groups[1].tasks).toHaveLength(2);
  });
});
