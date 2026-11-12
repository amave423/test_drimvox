const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, generateToken } = require('../middleware/auth');
const { getDb, saveDb } = require('../db');

const router = express.Router();

router.post('/register', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.users.find(u => u.username === username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const user = {
    id: db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    username,
    password_hash: hash,
    created_at: new Date().toISOString(),
  };

  db.users.push(user);
  saveDb();

  const token = generateToken(user.id);
  res.status(201).json({ token, userId: user.id, username: user.username });
});

router.post('/login', (req, res) => {
  const db = getDb();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);
  res.json({ token, userId: user.id, username: user.username });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, created_at: user.created_at });
});

module.exports = router;
