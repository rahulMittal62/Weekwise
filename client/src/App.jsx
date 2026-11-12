import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { taskApi } from './lib/api.js';
import { formatWeekRange, getWeekStart, groupTasksByWeek, weekKey } from './lib/dateUtils.js';
import TaskForm from './components/TaskForm.jsx';
import TaskItem from './components/TaskItem.jsx';
import Onboarding from './components/Onboarding.jsx';

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'long' });

function WeekSummary({ week, active, onClick }) {
  const completed = week.tasks.filter((task) => task.status === 'completed').length;
  const open = week.tasks.length - completed;
  return (
    <button
      aria-expanded={active}
      className={`week-summary ${active ? 'week-summary-active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="week-calendar-icon">
        <CalendarDays size={18} />
      </span>
      <span className="week-summary-copy">
        <strong>{formatWeekRange(week.weekStart)}</strong>
        <small>
          {week.key === weekKey(new Date())
            ? 'This week'
            : `Week of ${monthFormatter.format(week.weekStart)}`}
        </small>
      </span>
      <span className="week-counts">
        <span>
          <i className="count-dot dot-open" />
          {open} open
        </span>
        <span>
          <i className="count-dot dot-done" />
          {completed} done
        </span>
      </span>
      <span className="week-chevron">
        {active ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
      </span>
    </button>
  );
}

function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function CalendarStrip({ selectedDay, onSelect }) {
  const monday = getWeekStart(selectedDay);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return date;
  });
  const labels = new Intl.DateTimeFormat('en', { weekday: 'short' });
  return (
    <div className="calendar-strip" aria-label="Choose a day this week">
      {days.map((date) => {
        const selected = dayKey(date) === dayKey(selectedDay);
        return (
          <button
            aria-pressed={selected}
            className={`calendar-day ${selected ? 'calendar-day-selected' : ''}`}
            key={dayKey(date)}
            onClick={() => onSelect(date)}
            type="button"
          >
            <span>{labels.format(date)}</span>
            <strong>{String(date.getDate()).padStart(2, '0')}</strong>
            {selected && <i />}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(
    () => window.localStorage.getItem('weekwise-started') === 'yes',
  );
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [expandedWeek, setExpandedWeek] = useState('');
  const [formTask, setFormTask] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const searchInput = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showAllWeek, setShowAllWeek] = useState(false);

  const loadTasks = useCallback(async (query) => {
    setLoading(true);
    try {
      const result = await taskApi.list(query);
      setTasks(result);
      const groups = groupTasksByWeek(result);
      const currentWeek = weekKey(new Date());
      setExpandedWeek((current) => {
        if (!current || groups.some((week) => week.key === current)) return current;
        return groups.some((week) => week.key === currentWeek)
          ? currentWeek
          : (groups[0]?.key ?? '');
      });
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks('');
  }, [loadTasks]); // Load the full planner once on entry.
  useEffect(() => {
    if (activeSearch === '') return;
    const timer = window.setTimeout(() => loadTasks(activeSearch), 250);
    return () => window.clearTimeout(timer);
  }, [activeSearch, loadTasks]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  const visibleTasks = tasks;
  const weeks = useMemo(() => groupTasksByWeek(visibleTasks), [visibleTasks]);
  const orderedWeeks = weeks;
  const selectedWeekTasks = tasks.filter((task) => weekKey(task.dueAt) === weekKey(selectedDay));
  const completedThisWeek = selectedWeekTasks.filter((task) => task.status === 'completed').length;
  const openThisWeek = selectedWeekTasks.length - completedThisWeek;
  const completion = selectedWeekTasks.length
    ? Math.round((completedThisWeek / selectedWeekTasks.length) * 100)
    : 0;
  const selectedDayTasks = selectedWeekTasks.filter(
    (task) => dayKey(task.dueAt) === dayKey(selectedDay),
  );
  const todayTasks = showAllWeek ? selectedWeekTasks : selectedDayTasks;

  async function saveTask(values) {
    if (formTask) {
      const updated = await taskApi.update(formTask.id, values);
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
      setExpandedWeek('');
      setSelectedDay(new Date(updated.dueAt));
      setError('');
      setToast('Your changes are saved');
    } else {
      const created = await taskApi.create(values);
      setTasks((current) => [...current, created]);
      setExpandedWeek('');
      setSelectedDay((current) =>
        dayKey(current) === dayKey(created.dueAt) ? current : new Date(created.dueAt),
      );
      setShowAllWeek(false);
      setError('');
      setToast('Added to your week');
    }
    setFormOpen(false);
    setFormTask(null);
  }

  async function toggleTask(task) {
    try {
      const updated = await taskApi.update(task.id, {
        status: task.status === 'completed' ? 'in_progress' : 'completed',
      });
      setTasks((current) => current.map((entry) => (entry.id === task.id ? updated : entry)));
      setError('');
      setToast(
        updated.status === 'completed' ? 'One thing off your mind' : 'Moved back to your list',
      );
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return;
    try {
      await taskApi.remove(task.id);
      setTasks((current) => current.filter((entry) => entry.id !== task.id));
      setError('');
      setToast('Task deleted');
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  function startPlanner() {
    window.localStorage.setItem('weekwise-started', 'yes');
    setHasStarted(true);
  }

  function openSearch() {
    setSearch('');
    setActiveSearch('');
    setSearchOpen(true);
  }

  function closeSearch() {
    setSearch('');
    setActiveSearch('');
    setSearchOpen(false);
    loadTasks('');
  }

  if (!hasStarted) return <Onboarding onStart={startPlanner} />;

  return (
    <div className="task-app">
      <header className={`task-app-header ${searchOpen ? 'task-app-header-search' : ''}`}>
        {searchOpen ? (
          <>
            <button
              className="back-button"
              aria-label="Back to home"
              onClick={closeSearch}
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="mobile-search-field">
              <input
                ref={searchInput}
                aria-label="Search for a task"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveSearch(event.target.value);
                }}
                placeholder="Finish"
                value={search}
              />
              <Search size={20} />
            </div>
          </>
        ) : (
          <button
            className="mobile-search-field mobile-search-trigger"
            aria-label="Search for a task"
            onClick={openSearch}
            type="button"
          >
            <span>Search for a task</span>
            <Search size={18} />
          </button>
        )}
      </header>

      {searchOpen ? (
        <main className="search-page">
          {error && (
            <div className="mobile-error" role="alert">
              {error}
              <button onClick={() => loadTasks(search)} type="button">
                Retry
              </button>
            </div>
          )}
          {loading ? (
            <div className="mobile-loading">
              <span className="loader" />
              Searching your list...
            </div>
          ) : visibleTasks.length ? (
            <div className="task-list search-task-list">
              {[...visibleTasks]
                .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
                .map((task) => (
                  <TaskItem
                    compact
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={(selected) => {
                      setFormTask(selected);
                      setFormOpen(true);
                    }}
                    onDelete={deleteTask}
                  />
                ))}
            </div>
          ) : (
            <div className="search-empty">
              <h2>{search ? 'No matches yet' : 'Your list is empty'}</h2>
              <p>{search ? 'Try another keyword.' : 'Add a task and it will show up here.'}</p>
            </div>
          )}
        </main>
      ) : (
        <main className="home-page">
          <CalendarStrip
            selectedDay={selectedDay}
            onSelect={(date) => {
              setSelectedDay(date);
              setShowAllWeek(false);
            }}
          />
          <section className="summary-cards" aria-label="This week summary">
            <article className="summary-card summary-card-done">
              <span className="summary-card-icon">
                <Check size={15} />
              </span>
              <div>
                <span>Task Complete</span>
                <strong>{String(completedThisWeek).padStart(2, '0')}</strong>
                <small>This Week</small>
              </div>
            </article>
            <article className="summary-card summary-card-pending">
              <span className="summary-card-icon">
                <X size={15} />
              </span>
              <div>
                <span>Task Pending</span>
                <strong>{String(openThisWeek).padStart(2, '0')}</strong>
                <small>This Week</small>
              </div>
            </article>
          </section>
          <section className="weekly-progress">
            <div className="mobile-section-title">
              <h2>Weekly Progress</h2>
              <span>{completion}%</span>
            </div>
            <div className="weekly-progress-track">
              <span style={{ width: `${completion}%` }} />
            </div>
          </section>

          <section className="today-section">
            <div className="mobile-section-title">
              <h2>
                {showAllWeek
                  ? 'This Week'
                  : dayKey(selectedDay) === dayKey(new Date())
                    ? 'Tasks Today'
                    : `Tasks ${new Intl.DateTimeFormat('en', { weekday: 'long' }).format(selectedDay)}`}
              </h2>
              <button
                className="view-all-button"
                onClick={() => setShowAllWeek((current) => !current)}
                type="button"
              >
                {showAllWeek ? 'Today' : 'View All'}
              </button>
            </div>
            {error && (
              <div className="mobile-error" role="alert">
                {error}
                <button onClick={() => loadTasks('')} type="button">
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="mobile-loading">
                <span className="loader" />
                Loading your tasks...
              </div>
            ) : todayTasks.length ? (
              <div className="task-list home-task-list">
                {[...todayTasks]
                  .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
                  .map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onEdit={(selected) => {
                        setFormTask(selected);
                        setFormOpen(true);
                      }}
                      onDelete={deleteTask}
                    />
                  ))}
              </div>
            ) : (
              <div className="today-empty">
                <p>
                  {tasks.length
                    ? 'Nothing planned for this day.'
                    : 'Your week is ready for a first step.'}
                </p>
                <button
                  onClick={() => {
                    setFormTask(null);
                    setFormOpen(true);
                  }}
                  type="button"
                >
                  <Plus size={15} />
                  Add a task
                </button>
              </div>
            )}
          </section>

          {orderedWeeks.length > 0 && (
            <section className="week-archive">
              <div className="archive-title">
                <span>YOUR PLAN</span>
                <h2>By week</h2>
              </div>
              <div className="week-list">
                {orderedWeeks.map((week) => {
                  const expanded = expandedWeek === week.key;
                  const weekTasks = [...week.tasks].sort(
                    (a, b) => new Date(a.dueAt) - new Date(b.dueAt),
                  );
                  return (
                    <section
                      className={`week-group ${expanded ? 'week-group-expanded' : ''}`}
                      key={week.key}
                    >
                      <WeekSummary
                        active={expanded}
                        onClick={() => setExpandedWeek(expanded ? '' : week.key)}
                        week={week}
                      />
                      {expanded && (
                        <div className="week-details">
                          <div className="week-detail-header">
                            <span>
                              {week.tasks.length} {week.tasks.length === 1 ? 'task' : 'tasks'}{' '}
                              <span className="detail-divider">·</span> Monday – Sunday
                            </span>
                            <span>
                              <Clock3 size={13} />
                              {
                                week.tasks.filter((task) => task.status === 'in_progress').length
                              }{' '}
                              still to do
                            </span>
                          </div>
                          <div className="task-list">
                            {weekTasks.map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                onToggle={toggleTask}
                                onEdit={(selected) => {
                                  setFormTask(selected);
                                  setFormOpen(true);
                                }}
                                onDelete={deleteTask}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      )}

      {!searchOpen && (
        <button
          className="floating-add"
          aria-label="Add a task"
          onClick={() => {
            setFormTask(null);
            setFormOpen(true);
          }}
          type="button"
        >
          <Plus size={25} />
        </button>
      )}
      {formOpen && (
        <TaskForm
          task={formTask}
          onClose={() => {
            setFormOpen(false);
            setFormTask(null);
          }}
          onSave={saveTask}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification" type="button">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
