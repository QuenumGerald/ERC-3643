import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../../tokenization-engine/deployments.sqlite');
export const db = new sqlite3.Database(dbPath);

export const pool = {
  query: (text: string, params: any[] = []): Promise<{ rows: any[] }> => {
    return new Promise((resolve, reject) => {
      // Replace Postgres $1, $2 parameters with SQLite ? parameters
      const sql = text.replace(/\$\d+/g, '?');

      const trimmedSql = sql.trim().toLowerCase();
      const isSelect = trimmedSql.startsWith('select') || trimmedSql.startsWith('with');

      if (isSelect) {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [] });
        });
      } else {
        db.run(sql, params, function(err) {
          if (err) return reject(err);
          resolve({ rows: [] });
        });
      }
    });
  },
  end: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

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

export async function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tokenAddress VARCHAR(42) NOT NULL,
        \`from\` VARCHAR(42) NOT NULL,
        \`to\` VARCHAR(42) NOT NULL,
        value VARCHAR(78) NOT NULL,
        compliant BOOLEAN NOT NULL,
        txHash VARCHAR(66) NOT NULL,
        block INT NOT NULL,
        timestamp TEXT NOT NULL,
        confirmed BOOLEAN DEFAULT 0,
        confirmations INT DEFAULT 0
      );
    `;
    db.exec(createTableQuery, (err) => {
      if (err) {
        console.error('Failed to initialize SQLite database transfers:', err);
        reject(err);
      } else {
        // Create indexes
        db.run('CREATE INDEX IF NOT EXISTS idx_transfers_tokenAddress ON transfers(tokenAddress);', (err1) => {
          if (err1) return reject(err1);
          db.run('CREATE INDEX IF NOT EXISTS idx_transfers_txHash ON transfers(txHash);', (err2) => {
            if (err2) return reject(err2);
            db.run('CREATE INDEX IF NOT EXISTS idx_transfers_confirmed ON transfers(confirmed);', (err3) => {
              if (err3) return reject(err3);
              console.log('SQLite Transfers table initialized successfully.');
              resolve();
            });
          });
        });
      }
    });
  });
}

export async function fetchDeployedTokens(): Promise<string[]> {
  try {
    const res = await pool.query('SELECT token_address FROM deployments');
    return res.rows.map((row: any) => row.token_address);
  } catch (err) {
    console.error('Error fetching deployed tokens from deployments table:', err);
    return [];
  }
}

export async function insertTransfer(transfer: DBTransfer): Promise<number> {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO transfers (tokenAddress, \`from\`, \`to\`, value, compliant, txHash, block, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [
      transfer.tokenAddress.toLowerCase(),
      transfer.from.toLowerCase(),
      transfer.to.toLowerCase(),
      transfer.value,
      transfer.compliant ? 1 : 0,
      transfer.txHash,
      transfer.block,
      transfer.timestamp.toISOString()
    ], function(err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

export async function updateConfirmations(latestBlock: number, targetConfirmations: number = 12): Promise<number> {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE transfers
      SET 
        confirmations = ? - block,
        confirmed = CASE WHEN (? - block) >= ? THEN 1 ELSE 0 END
      WHERE confirmed = 0 AND block <= ?
    `;
    db.run(query, [latestBlock, latestBlock, targetConfirmations, latestBlock], function(err) {
      if (err) return reject(err);
      resolve(this.changes || 0);
    });
  });
}
