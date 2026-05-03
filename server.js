require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const pool = require('./db');
const initDB = require('./initDB');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Init DB on startup
initDB().catch(console.error);

// ─── CREATE ANKETA ────────────────────────────────────────────────────────────
app.post('/api/anketa', async (req, res) => {
  try {
    const { owner_name, title, questions, stickers, background, font } = req.body;
    if (!owner_name || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Нужно имя и хотя бы один вопрос!' });
    }
    const result = await pool.query(
      `INSERT INTO anketas (owner_name, title, questions, stickers, background, font)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [owner_name, title || 'Моя анкета', JSON.stringify(questions), JSON.stringify(stickers || []), background || 'pink', font || 'cursive']
    );
    res.json({ id: result.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET ANKETA ───────────────────────────────────────────────────────────────
app.get('/api/anketa/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anketas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Анкета не найдена' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── SUBMIT RESPONSE ──────────────────────────────────────────────────────────
app.post('/api/anketa/:id/response', async (req, res) => {
  try {
    const { friend_name, answers } = req.body;
    if (!friend_name || !answers) {
      return res.status(400).json({ error: 'Нужно имя и ответы!' });
    }
    await pool.query(
      `INSERT INTO responses (anketa_id, friend_name, answers) VALUES ($1, $2, $3)`,
      [req.params.id, friend_name, JSON.stringify(answers)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET RESPONSES ────────────────────────────────────────────────────────────
app.get('/api/anketa/:id/responses', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM responses WHERE anketa_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌸 Server running on http://localhost:${PORT}`));
