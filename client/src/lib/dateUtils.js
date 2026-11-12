export function getWeekStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date;
}

export function weekKey(value) {
  const start = getWeekStart(value);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
}

export function formatWeekRange(value) {
  const start = getWeekStart(value);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const monthDay = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${monthDay.format(start)} – ${end.getDate()}`
    : `${monthDay.format(start)} – ${monthDay.format(end)}`;
}

export function groupTasksByWeek(tasks) {
  const groups = new Map();
  tasks.forEach((task) => {
    const key = weekKey(task.dueAt);
    if (!groups.has(key)) groups.set(key, { key, weekStart: getWeekStart(task.dueAt), tasks: [] });
    groups.get(key).tasks.push(task);
  });
  return [...groups.values()].sort((a, b) => b.weekStart - a.weekStart);
}

export function toDateTimeLocal(value) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function fromDateTimeLocal(value) {
  return new Date(value).toISOString();
}
