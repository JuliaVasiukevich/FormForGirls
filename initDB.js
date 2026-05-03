const pool = require('./db');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS anketas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Моя анкета',
      questions JSONB NOT NULL DEFAULT '[]',
      stickers JSONB NOT NULL DEFAULT '[]',
      background TEXT DEFAULT 'pink',
      font TEXT DEFAULT 'cursive',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      anketa_id UUID REFERENCES anketas(id) ON DELETE CASCADE,
      friend_name TEXT NOT NULL,
      answers JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Database tables ready!');
}

module.exports = initDB;
