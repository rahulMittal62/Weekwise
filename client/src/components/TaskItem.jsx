import { Check, Clock3, Pencil, Trash2 } from 'lucide-react';

const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High' };
const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

export default function TaskItem({ task, onToggle, onEdit, onDelete, compact = false }) {
  return (
    <article
      className={`task-item ${compact ? 'task-item-compact' : ''} ${task.status === 'completed' ? 'is-complete' : ''}`}
    >
      <button
        className={`task-check ${task.status === 'completed' ? 'checked' : ''}`}
        onClick={() => onToggle(task)}
        aria-label={
          task.status === 'completed' ? `Mark ${task.title} in progress` : `Complete ${task.title}`
        }
        type="button"
      >
        {task.status === 'completed' && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="task-copy">
        <h3>{task.title}</h3>
        {!compact && task.description && <p>{task.description}</p>}
        {!compact && (
          <div className="task-meta">
            <span className="time-meta">
              <Clock3 size={13} />
              {timeFormatter.format(new Date(task.dueAt))}
            </span>
            <span className={`priority-pill priority-${task.priority}`}>
              <span />
              {priorityLabels[task.priority]}
            </span>
          </div>
        )}
      </div>
      {!compact && (
        <div className="task-actions">
          <button
            className="task-action-button"
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
            type="button"
          >
            <Trash2 size={16} />
          </button>
          <button
            className="task-action-button"
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            title="Edit task"
            type="button"
          >
            <Pencil size={16} />
          </button>
        </div>
      )}
    </article>
  );
}
