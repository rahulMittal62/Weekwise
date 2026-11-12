import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const seed = [
  {
    id: '507f1f77bcf86cd799439011',
    title: 'Write project brief',
    description: 'First draft',
    dueAt: new Date('2026-11-12T10:00:00Z'),
    priority: 'high',
    status: 'in_progress',
  },
];
function makeRepository() {
  const items = seed.map((task) => ({ ...task }));
  return {
    list: async (filter) =>
      items.filter(
        (task) =>
          !filter.$or ||
          filter.$or.some(
            (field) =>
              Object.values(field)[0].test(task.title) ||
              Object.values(field)[0].test(task.description),
          ),
      ),
    create: async (task) => ({ ...task, id: '507f1f77bcf86cd799439012' }),
    update: async (id, updates) => {
      const task = items.find((entry) => entry.id === id);
      return task ? Object.assign(task, updates) : null;
    },
    remove: async (id) => {
      const index = items.findIndex((entry) => entry.id === id);
      return index < 0 ? null : items.splice(index, 1)[0];
    },
  };
}

describe('task API', () => {
  it('returns tasks in a data envelope', async () => {
    const response = await request(createApp({ repository: makeRepository() }))
      .get('/api/tasks')
      .expect(200);
    expect(response.body.data[0]).toMatchObject({
      title: 'Write project brief',
      status: 'in_progress',
    });
  });

  it('creates tasks after validating the required fields', async () => {
    const app = createApp({ repository: makeRepository() });
    await request(app).post('/api/tasks').send({ title: ' ', dueAt: 'bad-date' }).expect(400);
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Review notes', dueAt: '2026-11-13T09:30:00Z' })
      .expect(201);
    expect(response.body.data).toMatchObject({
      title: 'Review notes',
      priority: 'medium',
      status: 'in_progress',
    });
  });

  it('updates status and reports missing tasks', async () => {
    const app = createApp({ repository: makeRepository() });
    const response = await request(app)
      .patch(`/api/tasks/${seed[0].id}`)
      .send({ status: 'completed' })
      .expect(200);
    expect(response.body.data.status).toBe('completed');
    await request(app)
      .patch('/api/tasks/507f191e810c19729de860ea')
      .send({ status: 'completed' })
      .expect(404);
  });

  it('deletes an existing task', async () => {
    const app = createApp({ repository: makeRepository() });
    await request(app).delete(`/api/tasks/${seed[0].id}`).expect(204);
    await request(app).delete(`/api/tasks/${seed[0].id}`).expect(404);
  });
});
