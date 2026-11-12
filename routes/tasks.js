const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDb, saveDb } = require('../db');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const tasks = db.tasks
    .filter(t => t.user_id === req.user.userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(tasks);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { title } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const task = {
    id: db.tasks.length > 0 ? Math.max(...db.tasks.map(t => t.id)) + 1 : 1,
    user_id: req.user.userId,
    title: title.trim(),
    done: false,
    created_at: new Date().toISOString(),
  };

  db.tasks.push(task);
  saveDb();

  res.status(201).json(task);
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { done } = req.body;

  const task = db.tasks.find(t => t.id === parseInt(id, 10));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  task.done = done !== undefined ? !!done : true;
  saveDb();

  res.json(task);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const index = db.tasks.findIndex(t => t.id === parseInt(id, 10));
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = db.tasks[index];
  if (task.user_id !== req.user.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.tasks.splice(index, 1);
  saveDb();

  res.json({ message: 'Task deleted' });
});

module.exports = router;
