const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register new user (admin only)
router.post('/register', async (req, res) => {
  const { username, password, role, site_id } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role, site_id) VALUES ($1, $2, $3, $4) RETURNING id, username, role, site_id',
      [username, hashedPassword, role, site_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      res.status(409).json({ message: 'Username already exists' });
    } else {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Missing username or password' });
  }
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role, siteId: user.site_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, site_id: user.site_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
