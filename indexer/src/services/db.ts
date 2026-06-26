import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

export interface DBTransfer {
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  compliant: boolean;
  txHash: string;
  block: number;
  timestamp: Date;
}

export async function initDatabase() {
  const client = await pool.connect();
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        "tokenAddress" VARCHAR(42) NOT NULL,
        "from" VARCHAR(42) NOT NULL,
        "to" VARCHAR(42) NOT NULL,
        value VARCHAR(78) NOT NULL,
        compliant BOOLEAN NOT NULL,
        "txHash" VARCHAR(66) NOT NULL,
        block INT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        confirmed BOOLEAN DEFAULT FALSE,
        confirmations INT DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_transfers_tokenAddress ON transfers("tokenAddress");
      CREATE INDEX IF NOT EXISTS idx_transfers_txHash ON transfers("txHash");
      CREATE INDEX IF NOT EXISTS idx_transfers_confirmed ON transfers(confirmed);
    `;
    await client.query(query);
    console.log('Database initialized (transfers table ensured).');
  } catch (err) {
    console.error('Failed to initialize database table transfers:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function fetchDeployedTokens(): Promise<string[]> {
  try {
    const res = await pool.query('SELECT token_address FROM deployments');
    return res.rows.map((row) => row.token_address);
  } catch (err) {
    console.error('Error fetching deployed tokens from deployments table:', err);
    return [];
  }
}

export async function insertTransfer(transfer: DBTransfer): Promise<number> {
  const query = `
    INSERT INTO transfers ("tokenAddress", "from", "to", value, compliant, "txHash", block, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;
  const values = [
    transfer.tokenAddress,
    transfer.from,
    transfer.to,
    transfer.value,
    transfer.compliant,
    transfer.txHash,
    transfer.block,
    transfer.timestamp,
  ];
  const res = await pool.query(query, values);
  return res.rows[0].id;
}

export async function updateConfirmations(latestBlock: number, targetConfirmations: number = 12): Promise<number> {
  // Update confirmations and mark confirmed = true if threshold is met
  const query = `
    UPDATE transfers
    SET 
      confirmations = $1 - block,
      confirmed = CASE WHEN ($1 - block) >= $2 THEN TRUE ELSE FALSE END
    WHERE confirmed = FALSE AND block <= $1
  `;
  const res = await pool.query(query, [latestBlock, targetConfirmations]);
  return res.rowCount || 0;
}
