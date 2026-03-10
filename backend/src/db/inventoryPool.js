import pg from 'pg';
const { Pool } = pg;
import process from 'process';

/**
 * Inventory Database Connection Pool
 * 
 * Separate database pool for inventory management
 * Uses same credentials as main HRMS database but connects to hrms_inventory database
 */

// Build inventory database connection string from env vars
const dbUser = process.env.DB_USER || 'theaiq';
const dbPassword = process.env.DB_PASSWORD || 'TheAIQ!@2026';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';

// URL encode the password to handle special characters
const encodedPassword = encodeURIComponent(dbPassword);
const inventoryDbUrl = `postgres://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/hrms_inventory`;

const inventoryPoolConfig = {
  connectionString: inventoryDbUrl,
  
  // Connection pool settings
  max: 20,  // Maximum number of clients in the pool
  connectionTimeoutMillis: 10000,  // Return error after 10 seconds if connection not available
  
  // Additional settings for better performance
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create inventory database pool
const inventoryPool = new Pool(inventoryPoolConfig);

// Log connection info (without sensitive data)
inventoryPool.on('connect', (client) => {
  console.log('📦 Connected to Inventory Database');
});

inventoryPool.on('error', (err, client) => {
  console.error('❌ Unexpected error on inventory database client', err);
  process.exit(-1);
});

// Test the connection on startup
inventoryPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Failed to connect to inventory database:', err.message);
    console.error('⚠️  Make sure hrms_inventory database exists');
    console.error('⚠️  Run: psql -U theaiq -d postgres -f backend/docs/create_inventory_database.sql');
  } else {
    console.log('✅ Inventory Database Connected:', res.rows[0].now);
  }
});

/**
 * Graceful shutdown
 */
// Graceful shutdown (idempotent)
let inventoryPoolClosed = false;
async function closeInventoryPool() {
  if (inventoryPoolClosed) return;
  inventoryPoolClosed = true;
  try {
    console.log('📦 Closing inventory database pool...');
    await inventoryPool.end();
    console.log('✅ Inventory database pool closed');
  } catch (err) {
    console.error('Error closing inventory database pool', err);
  }
}

process.on('SIGTERM', closeInventoryPool);
process.on('SIGINT', closeInventoryPool);

export default inventoryPool;
