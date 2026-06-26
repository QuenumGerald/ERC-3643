import jwt from 'jsonwebtoken';
import { config } from '../config';
import { initDatabase, pool } from './index';

async function main() {
  // Ensure the table is created
  await initDatabase();
  console.log('Database initialized.');

  // Create a sample seed record in alignments/deployments table
  try {
    const checkQuery = 'SELECT COUNT(*) FROM deployments';
    const res = await pool.query(checkQuery);
    const count = parseInt(res.rows[0].count, 10);
    
    if (count === 0) {
      const insertQuery = `
        INSERT INTO deployments (chain_id, token_address, identity_registry, compliance_address, owner, params, tx_hash, block)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await pool.query(insertQuery, [
        1337,
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        JSON.stringify({ name: 'Seed Token', symbol: 'SEED', initialSupplyCap: '1000000' }),
        '0x5555555555555555555555555555555555555555555555555555555555555555',
        100
      ]);
      console.log('Seeded a sample deployment record.');
    } else {
      console.log('Deployments table already has records. Skipping insert.');
    }
  } catch (err) {
    console.error('Error seeding deployments:', err);
  }

  // Generate sample JWT tokens
  const adminToken = jwt.sign(
    { issuerId: 'admin-1', role: 'ADMIN' },
    config.jwtSecret,
    { expiresIn: '1y' }
  );
  
  const issuerToken = jwt.sign(
    { issuerId: 'issuer-1', role: 'ISSUER' },
    config.jwtSecret,
    { expiresIn: '1y' }
  );

  console.log('\n--- Mock JWT Tokens for Testing ---');
  console.log(`ADMIN JWT: Bearer ${adminToken}`);
  console.log(`ISSUER JWT: Bearer ${issuerToken}`);
  console.log('------------------------------------\n');
  
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
