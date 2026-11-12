import { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { fromDateTimeLocal, toDateTimeLocal } from '../lib/dateUtils.js';

const blankTask = () => ({
  title: '',
  description: '',
  dueAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
  priority: 'medium',
});

export default function TaskForm({ task, onClose, onSave }) {
  const [form, setForm] = useState(
    task ? { ...task, dueAt: toDateTimeLocal(task.dueAt) } : blankTask(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);
  const update = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Give your task a name before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { title, description, dueAt, priority, status } = form;
      await onSave({
        title: title.trim(),
        description: description.trim(),
        dueAt: fromDateTimeLocal(dueAt),
        priority,
        ...(status ? { status } : {}),
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">YOUR TASK</span>
            <h2 id="task-form-title">{task ? 'Edit Task' : 'Add New Task'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        <form className="task-form" onSubmit={submit}>
          <label className="field-label" htmlFor="task-title">
            What needs doing?<span className="required">*</span>
          </label>
          <input
            autoFocus
            id="task-title"
            maxLength={120}
            name="title"
            onChange={update}
            placeholder="e.g. Prepare a project update"
            value={form.title}
          />
          <label className="field-label" htmlFor="task-description">
            A few details <span className="optional">(optional)</span>
          </label>
          <textarea
            id="task-description"
            maxLength={1000}
            name="description"
            onChange={update}
            placeholder="Add a note to future you…"
            rows={3}
            value={form.description}
          />
          <div className="field-grid">
            <div>
              <label className="field-label" htmlFor="task-date">
                <CalendarDays size={15} /> Due date <span className="required">*</span>
              </label>
              <input
                id="task-date"
                name="dueAt"
                onChange={update}
                required
                type="datetime-local"
                value={form.dueAt}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="task-priority">
                Priority
              </label>
              <select id="task-priority" name="priority" onChange={update} value={form.priority}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button className="button button-soft" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" disabled={saving} type="submit">
              {saving ? 'Saving…' : task ? 'Save changes' : 'Add to my week'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
