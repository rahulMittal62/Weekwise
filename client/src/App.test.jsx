import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { list, create, update, remove } = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('./lib/api.js', () => ({ taskApi: { list, create, update, remove } }));
import App from './App.jsx';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  window.localStorage.removeItem('weekwise-started');
});
beforeEach(() => {
  window.localStorage.setItem('weekwise-started', 'yes');
});

const todayAtTen = () => {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
};

describe('Weekwise planner', () => {
  it('shows the onboarding screen before opening the planner', async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem('weekwise-started');
    list.mockResolvedValueOnce([]);
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Manage What To Do' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(window.localStorage.getItem('weekwise-started')).toBe('yes');
    expect(screen.getByRole('button', { name: 'Search for a task' })).toBeInTheDocument();
  });

  it('adds a task from the empty state and displays it in the selected week', async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce([]);
    create.mockResolvedValueOnce({
      id: 'task-1',
      title: 'Prepare release notes',
      description: '',
      dueAt: '2026-11-12T10:00:00.000Z',
      priority: 'medium',
      status: 'in_progress',
    });
    render(<App />);
    await screen.findByText('Your week is ready for a first step.');
    await user.click(screen.getAllByRole('button', { name: 'Add a task' })[0]);
    await user.type(screen.getByLabelText(/what needs doing/i), 'Prepare release notes');
    await user.click(screen.getByRole('button', { name: /add to my week/i }));
    expect(
      await screen.findByRole('heading', { name: 'Prepare release notes' }),
    ).toBeInTheDocument();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Prepare release notes', priority: 'medium' }),
    );
  });

  it('updates a task status and reflects the weekly counts', async () => {
    const user = userEvent.setup();
    const task = {
      id: 'task-1',
      title: 'Review the pull request',
      description: '',
      dueAt: todayAtTen(),
      priority: 'high',
      status: 'in_progress',
    };
    list.mockResolvedValueOnce([task]);
    update.mockResolvedValueOnce({ ...task, status: 'completed' });
    render(<App />);
    await screen.findByRole('heading', { name: 'Review the pull request' });
    await user.click(screen.getByRole('button', { name: 'Complete Review the pull request' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('task-1', { status: 'completed' }));
    expect(await screen.findByText('One thing off your mind')).toBeInTheDocument();
    expect(screen.getByText('Task Pending').parentElement).toHaveTextContent('00');
    expect(screen.getByText('Task Complete').parentElement).toHaveTextContent('01');
  });

  it('edits an existing task from its task menu', async () => {
    const user = userEvent.setup();
    const task = {
      id: 'task-2',
      title: 'Review planning',
      description: '',
      dueAt: todayAtTen(),
      priority: 'medium',
      status: 'in_progress',
    };
    list.mockResolvedValueOnce([task]);
    update.mockResolvedValueOnce({ ...task, title: 'Review sprint planning' });
    render(<App />);
    await screen.findByRole('heading', { name: 'Review planning' });
    await user.click(screen.getByRole('button', { name: 'Edit Review planning' }));
    const title = screen.getByLabelText(/what needs doing/i);
    await user.clear(title);
    await user.type(title, 'Review sprint planning');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(
      await screen.findByRole('heading', { name: 'Review sprint planning' }),
    ).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(
      'task-2',
      expect.objectContaining({ title: 'Review sprint planning' }),
    );
  });

  it('deletes a task after confirmation', async () => {
    const user = userEvent.setup();
    const task = {
      id: 'task-3',
      title: 'Remove me',
      description: '',
      dueAt: todayAtTen(),
      priority: 'low',
      status: 'in_progress',
    };
    list.mockResolvedValueOnce([task]);
    remove.mockResolvedValueOnce(null);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await screen.findByRole('heading', { name: 'Remove me' });
    await user.click(screen.getByRole('button', { name: 'Delete Remove me' }));
    expect(remove).toHaveBeenCalledWith('task-3');
    expect(await screen.findByText('Your week is ready for a first step.')).toBeInTheDocument();
  });

  it('opens task search and queries the API', async () => {
    const user = userEvent.setup();
    const task = {
      id: 'task-4',
      title: 'Review the launch plan',
      description: '',
      dueAt: todayAtTen(),
      priority: 'medium',
      status: 'in_progress',
    };
    list.mockResolvedValueOnce([task]).mockResolvedValueOnce([task]);
    render(<App />);
    await screen.findByRole('heading', { name: 'Review the launch plan' });
    await user.click(screen.getByRole('button', { name: 'Search for a task' }));
    await user.type(screen.getByRole('textbox', { name: 'Search for a task' }), 'launch');
    await waitFor(() => expect(list).toHaveBeenLastCalledWith('launch'));
    expect(screen.getByRole('heading', { name: 'Review the launch plan' })).toBeInTheDocument();
  });
});
