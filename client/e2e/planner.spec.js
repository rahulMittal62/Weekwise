import { expect, test } from '@playwright/test';

function makeTask(overrides = {}) {
  const dueAt = new Date();
  dueAt.setHours(10, 0, 0, 0);
  return {
    id: 'task-1',
    title: 'Finish wireframe',
    description: 'Review the mobile screens',
    dueAt: dueAt.toISOString(),
    priority: 'medium',
    status: 'in_progress',
    ...overrides,
  };
}

test.beforeEach(async ({ page }) => {
  const tasks = [];
  await page.route('**/api/tasks**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname.split('/').at(-1);
    if (request.method() === 'GET') {
      const search = url.searchParams.get('search')?.toLowerCase();
      const data = search
        ? tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(search))
        : tasks;
      await route.fulfill({ json: { data } });
      return;
    }
    if (request.method() === 'POST') {
      const task = makeTask({ ...request.postDataJSON(), id: `task-${tasks.length + 1}` });
      tasks.push(task);
      await route.fulfill({ status: 201, json: { data: task } });
      return;
    }
    if (request.method() === 'PATCH') {
      const task = tasks.find((item) => item.id === id);
      if (!task) {
        await route.fulfill({ status: 404, json: { error: 'Task not found.' } });
        return;
      }
      Object.assign(task, request.postDataJSON());
      await route.fulfill({ json: { data: task } });
      return;
    }
    if (request.method() === 'DELETE') {
      const index = tasks.findIndex((task) => task.id === id);
      if (index >= 0) tasks.splice(index, 1);
      await route.fulfill({ status: 204, body: '' });
    }
  });
});

test('onboarding opens the weekly home screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Manage What To Do' })).toBeVisible();
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByRole('button', { name: 'Search for a task' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weekly Progress' })).toBeVisible();
});

test('creates and completes a task on the mobile home screen', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('weekwise-started', 'yes'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add a task' }).first().click();
  await expect(page.getByRole('heading', { name: 'Add New Task' })).toBeVisible();
  await page.getByLabel(/what needs doing/i).fill('Prepare weekly plan');
  await page.getByRole('button', { name: /add to my week/i }).click();
  await expect(page.getByRole('heading', { name: 'Prepare weekly plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete Prepare weekly plan' }).click();
  await expect(page.getByText('Task Complete').locator('..')).toContainText('01');
});

test('edits and deletes a task from the home screen', async ({ page }) => {
  const task = makeTask();
  await page.route('**/api/tasks**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { data: [task] } });
    if (route.request().method() === 'PATCH') {
      Object.assign(task, route.request().postDataJSON());
      return route.fulfill({ json: { data: task } });
    }
    if (route.request().method() === 'DELETE') return route.fulfill({ status: 204, body: '' });
    return route.fallback();
  });
  await page.addInitScript(() => localStorage.setItem('weekwise-started', 'yes'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: task.title })).toBeVisible();
  await page.getByRole('button', { name: `Edit ${task.title}` }).click();
  await page.getByLabel(/what needs doing/i).fill('Finish the Figma implementation');
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect(
    page.getByRole('heading', { name: 'Finish the Figma implementation' }),
  ).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Finish the Figma implementation' }).click();
  await expect(page.getByText('Your week is ready for a first step.')).toBeVisible();
});

test('opens search and shows matching tasks', async ({ page }) => {
  const task = makeTask({ title: 'Meeting with the product team' });
  await page.route('**/api/tasks**', async (route) => {
    const search = new URL(route.request().url()).searchParams.get('search');
    const data = !search || task.title.toLowerCase().includes(search.toLowerCase()) ? [task] : [];
    await route.fulfill({ json: { data } });
  });
  await page.addInitScript(() => localStorage.setItem('weekwise-started', 'yes'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Search for a task' }).click();
  await page.getByRole('textbox', { name: 'Search for a task' }).fill('product');
  await expect(page.getByRole('heading', { name: task.title })).toBeVisible();
});

test('renders compact task rows in the focused search screen', async ({ page }) => {
  const tasks = [
    makeTask({ id: 'task-1', title: 'Finishing Wireframe' }),
    makeTask({ id: 'task-2', title: 'Meeting with team' }),
    makeTask({ id: 'task-3', title: 'Buy a cat food', status: 'completed' }),
  ];
  await page.route('**/api/tasks**', (route) => route.fulfill({ json: { data: tasks } }));
  await page.addInitScript(() => localStorage.setItem('weekwise-started', 'yes'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Search for a task' }).click();

  await expect(page.getByRole('textbox', { name: 'Search for a task' })).toHaveAttribute(
    'placeholder',
    'Finish',
  );
  for (const task of tasks)
    await expect(page.getByRole('heading', { name: task.title })).toBeVisible();
  await expect(page.locator('.search-task-list .task-meta')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mark Buy a cat food in progress' })).toBeVisible();
});
