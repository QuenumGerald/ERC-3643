import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create deployments table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS deployments (
        id SERIAL PRIMARY KEY,
        chain_id INT NOT NULL,
        token_address VARCHAR(42) NOT NULL,
        identity_registry VARCHAR(42) NOT NULL,
        compliance_address VARCHAR(42) NOT NULL,
        owner VARCHAR(42) NOT NULL,
        params JSONB NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        block INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_deployments_token_address ON deployments(token_address);
      CREATE INDEX IF NOT EXISTS idx_deployments_chain_id ON deployments(chain_id);
    `;
    await client.query(createTableQuery);
    console.log('Database initialized successfully (deployments table ensured).');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    client.release();
  }
}
