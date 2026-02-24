import app from './app.js';
import { env } from './config/env.js';
import { pool } from './db/pool.js';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to Postgres');
  } catch (err) {
    console.error('Postgres connection failed', err.message);
  }

  app.listen(env.port, () => {
    console.log(`API listening on :${env.port}`);
  });
}

start();
