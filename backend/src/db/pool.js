import pkg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

export default pool;
