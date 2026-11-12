const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

const { loadDb, getDb, saveDb } = require('../db');
const app = express();

app.use(require('cors')());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/auth', require('../routes/auth'));
app.use('/api/tasks', require('../routes/tasks'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

let server;
let token1, token2, userId1, userId2;

beforeAll(() => {
  const dbPath = path.join(__dirname, '..', 'db.json');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  loadDb();
  server = app.listen(0, () => {});
});

afterAll((done) => {
  server.close(done);
});

afterEach(() => {
  const db = getDb();
  db.tasks = [];
  db.users = [];
  saveDb();
  token1 = null;
  token2 = null;
  userId1 = null;
  userId2 = null;
});

describe('Auth API', () => {
  test('POST /api/auth/register creates a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user1', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.username).toBe('user1');
    expect(res.body).toHaveProperty('userId');
  });

  test('POST /api/auth/register rejects duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupuser', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupuser', password: 'pass456' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/auth/register rejects short username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'password123' });

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/register rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user2', password: '123' });

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/register rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'user3' });

    expect(res.status).toBe(400);
  });

  test('POST /api/auth/login succeeds with correct credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'logintest', password: 'pass123456' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'logintest', password: 'pass123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token1 = res.body.token;
    userId1 = res.body.userId;
  });

  test('POST /api/auth/login fails with wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'wrongpass', password: 'correct123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'wrongpass', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login fails for non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns user info with valid token', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'metest', password: 'pass123456' });

    token1 = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('metest');
  });

  test('GET /api/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Tasks API', () => {
  beforeEach(async () => {
    const reg1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'taskuser1', password: 'pass123456' });
    token1 = reg1.body.token;
    userId1 = reg1.body.userId;

    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'taskuser2', password: 'pass123456' });
    token2 = reg2.body.token;
    userId2 = reg2.body.userId;
  });

  test('GET /api/tasks returns empty array for new user', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST /api/tasks creates a new task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Buy groceries' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.done).toBe(false);
    expect(res.body).toHaveProperty('id');
  });

  test('POST /api/tasks rejects empty title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  test('PATCH /api/tasks/:id marks task as done', async () => {
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Learn Node.js' });

    const taskId = create.body.id;

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ done: true });

    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  test('DELETE /api/tasks/:id removes a task', async () => {
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Delete me' });

    const taskId = create.body.id;

    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted');

    const getRes = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token1}`);

    expect(getRes.body.length).toBe(0);
  });

  test('GET /api/tasks returns only own tasks', async () => {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'User1 task' });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'User2 task' });

    const res1 = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token1}`);

    expect(res1.body.length).toBe(1);
    expect(res1.body[0].title).toBe('User1 task');
  });

  test('POST /api/tasks assigns task to correct user', async () => {
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'User1 task' });

    const res2 = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token2}`);

    expect(res2.body.length).toBe(0);
  });

  test('PATCH /api/tasks/:id returns 403 for another user', async () => {
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'User1 secret task' });

    const taskId = create.body.id;

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ done: true });

    expect(res.status).toBe(403);
  });

  test('DELETE /api/tasks/:id returns 403 for another user', async () => {
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'User1 secret task' });

    const taskId = create.body.id;

    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(403);
  });

  test('GET /api/tasks/:id returns 404 for non-existent task', async () => {
    const res = await request(app)
      .get('/api/tasks/99999')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(404);
  });

  test('PATCH /api/tasks/:id returns 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/api/tasks/99999')
      .set('Authorization', `Bearer ${token1}`)
      .send({ done: true });

    expect(res.status).toBe(404);
  });

  test('DELETE /api/tasks/:id returns 404 for non-existent task', async () => {
    const res = await request(app)
      .delete('/api/tasks/99999')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(404);
  });
});

describe('Access control', () => {
  test('Tasks without token are rejected', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  test('Tasks with invalid token are rejected', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(401);
  });

  test('Users cannot access other users tasks via PATCH', async () => {
    const reg1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'owner', password: 'pass123456' });

    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'stranger', password: 'pass123456' });

    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${reg1.body.token}`)
      .send({ title: 'Private task' });

    const res = await request(app)
      .patch(`/api/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${reg2.body.token}`)
      .send({ done: true });

    expect(res.status).toBe(403);
  });

  test('Users cannot access other users tasks via DELETE', async () => {
    const reg1 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'owner2', password: 'pass123456' });

    const reg2 = await request(app)
      .post('/api/auth/register')
      .send({ username: 'stranger2', password: 'pass123456' });

    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${reg1.body.token}`)
      .send({ title: 'Private task 2' });

    const res = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${reg2.body.token}`);

    expect(res.status).toBe(403);
  });
});
