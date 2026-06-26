import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../deployments.sqlite');
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
          // Normalize COUNT(*) column name for compatibility
          const normalizedRows = rows.map((row: any) => {
            const newRow: any = { ...row };
            // Map keys
            if (row['count(*)'] !== undefined) {
              newRow.count = row['count(*)'];
            }
            if (row['COUNT(*)'] !== undefined) {
              newRow.count = row['COUNT(*)'];
            }
            return newRow;
          });
          resolve({ rows: normalizedRows });
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

export async function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chain_id INT NOT NULL,
        token_address VARCHAR(42) NOT NULL,
        identity_registry VARCHAR(42) NOT NULL,
        compliance_address VARCHAR(42) NOT NULL,
        owner VARCHAR(42) NOT NULL,
        params TEXT NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        block INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    db.exec(createTableQuery, (err) => {
      if (err) {
        console.error('Failed to initialize SQLite database:', err);
        reject(err);
      } else {
        // Create indexes individually to avoid issues
        db.run('CREATE INDEX IF NOT EXISTS idx_deployments_token_address ON deployments(token_address);', (err1) => {
          if (err1) return reject(err1);
          db.run('CREATE INDEX IF NOT EXISTS idx_deployments_chain_id ON deployments(chain_id);', (err2) => {
            if (err2) return reject(err2);
            console.log('SQLite Database initialized successfully.');
            resolve();
          });
        });
      }
    });
  });
}
