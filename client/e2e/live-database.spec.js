import { expect, test } from '@playwright/test';

const apiUrl = 'http://127.0.0.1:4000/api';
const uniqueMarker = () => `weekwise-live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test('live API health, validation, search, and task CRUD persist in MongoDB', async ({
  request,
}) => {
  const health = await request.get(`${apiUrl}/health`);
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok' });

  const marker = uniqueMarker();
  const originalTitle = `${marker}-created`;
  const editedTitle = `${marker}-edited`;
  let taskId;
  try {
    const invalid = await request.post(`${apiUrl}/tasks`, {
      data: { title: '', dueAt: 'not-a-date' },
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toHaveProperty('fields');

    const created = await request.post(`${apiUrl}/tasks`, {
      data: {
        title: originalTitle,
        description: `${marker} searchable description`,
        dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        priority: 'high',
      },
    });
    expect(created.status()).toBe(201);
    const createdTask = (await created.json()).data;
    taskId = createdTask.id;
    expect(createdTask).toMatchObject({
      title: originalTitle,
      priority: 'high',
      status: 'in_progress',
    });

    const searched = await request.get(
      `${apiUrl}/tasks?search=${encodeURIComponent(marker.toUpperCase())}`,
    );
    expect(searched.status()).toBe(200);
    expect((await searched.json()).data.map((task) => task.id)).toContain(taskId);

    const updated = await request.patch(`${apiUrl}/tasks/${taskId}`, {
      data: { title: editedTitle, status: 'completed', priority: 'low' },
    });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).data).toMatchObject({
      title: editedTitle,
      status: 'completed',
      priority: 'low',
    });

    const invalidUpdate = await request.patch(`${apiUrl}/tasks/${taskId}`, {
      data: { internalField: true },
    });
    expect(invalidUpdate.status()).toBe(400);

    const deleted = await request.delete(`${apiUrl}/tasks/${taskId}`);
    expect(deleted.status()).toBe(204);
    taskId = undefined;

    const afterDelete = await request.get(`${apiUrl}/tasks?search=${encodeURIComponent(marker)}`);
    expect((await afterDelete.json()).data).toEqual([]);
    const missing = await request.delete(`${apiUrl}/tasks/507f1f77bcf86cd799439011`);
    expect(missing.status()).toBe(404);
  } finally {
    if (taskId) await request.delete(`${apiUrl}/tasks/${taskId}`);
  }
});

test('real app creates, reads, completes, edits, searches, and deletes a MongoDB task', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const marker = uniqueMarker();
  const originalTitle = `${marker}-ui-created`;
  const editedTitle = `${marker}-ui-edited`;
  let taskId;
  await page.addInitScript(() => localStorage.setItem('weekwise-started', 'yes'));
  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Weekly Progress' })).toBeVisible();
    await page.locator('.floating-add').click();
    await page.getByLabel(/what needs doing/i).fill(originalTitle);
    await page.getByLabel(/a few details/i).fill(`${marker} from the browser`);
    await page.getByLabel('Priority').selectOption('high');
    await page.getByRole('button', { name: /add to my week/i }).click();
    await expect(page.getByRole('heading', { name: originalTitle })).toBeVisible();

    const createdResponse = await request.get(
      `${apiUrl}/tasks?search=${encodeURIComponent(marker)}`,
    );
    const createdTasks = (await createdResponse.json()).data;
    const createdTask = createdTasks.find((task) => task.title === originalTitle);
    expect(createdResponse.status()).toBe(200);
    expect(createdTask).toBeTruthy();
    taskId = createdTask.id;

    await page.getByRole('button', { name: `Complete ${originalTitle}` }).click();
    await expect(
      page.getByRole('button', { name: `Mark ${originalTitle} in progress` }),
    ).toBeVisible();
    const completedResponse = await request.get(
      `${apiUrl}/tasks?search=${encodeURIComponent(marker)}`,
    );
    expect((await completedResponse.json()).data.find((task) => task.id === taskId).status).toBe(
      'completed',
    );

    await page.getByRole('button', { name: `Edit ${originalTitle}` }).click();
    await page.getByLabel(/what needs doing/i).fill(editedTitle);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: editedTitle })).toBeVisible();
    const editedResponse = await request.get(
      `${apiUrl}/tasks?search=${encodeURIComponent(marker)}`,
    );
    expect((await editedResponse.json()).data.find((task) => task.id === taskId)).toMatchObject({
      title: editedTitle,
      status: 'completed',
    });

    await page.getByRole('button', { name: 'Search for a task' }).click();
    const search = page.getByRole('textbox', { name: 'Search for a task' });
    await search.fill(`${marker}-ui-edited`);
    await expect(page.getByRole('heading', { name: editedTitle })).toBeVisible();
    await expect(page.getByRole('heading', { name: originalTitle })).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to home' }).click();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: `Delete ${editedTitle}` }).click();
    await expect(page.getByRole('heading', { name: editedTitle })).toHaveCount(0);
    taskId = undefined;
  } finally {
    if (taskId) await request.delete(`${apiUrl}/tasks/${taskId}`);
  }
});

test('home and task form stay within common mobile, tablet, and desktop widths', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('weekwise-started', 'yes'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Weekly Progress' })).toBeVisible();

  const viewports = [320, 360, 375, 390, 430, 600, 768, 1024, 1280];
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.task-app')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      app: document.querySelector('.task-app').getBoundingClientRect().width,
    }));
    expect(dimensions.document, `home screen overflows at ${width}px`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
    expect(dimensions.app, `app exceeds ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }

  await page.locator('.floating-add').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 844 });
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, `task form overflows at ${width}px`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
  }

  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Search for a task' }).click();
  await expect(page.getByRole('textbox', { name: 'Search for a task' })).toBeVisible();
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 844 });
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, `search screen overflows at ${width}px`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
  }
});
