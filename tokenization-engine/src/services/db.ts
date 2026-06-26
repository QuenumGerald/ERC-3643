import { pool } from '../db';

export interface DeploymentRecord {
  chainId: number;
  tokenAddress: string;
  identityRegistry: string;
  complianceAddress: string;
  owner: string;
  params: any;
  txHash: string;
  block: number;
}

export class DbService {
  static async saveDeployment(record: DeploymentRecord): Promise<void> {
    const query = `
      INSERT INTO deployments (chain_id, token_address, identity_registry, compliance_address, owner, params, tx_hash, block)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await pool.query(query, [
      record.chainId,
      record.tokenAddress.toLowerCase(),
      record.identityRegistry.toLowerCase(),
      record.complianceAddress.toLowerCase(),
      record.owner.toLowerCase(),
      JSON.stringify(record.params),
      record.txHash,
      record.block
    ]);
  }

  static async getDeploymentByAddress(tokenAddress: string): Promise<any> {
    const query = `SELECT * FROM deployments WHERE token_address = $1`;
    const res = await pool.query(query, [tokenAddress.toLowerCase()]);
    return res.rows[0] || null;
  }

  static async getAllDeployments(): Promise<any[]> {
    const query = `SELECT * FROM deployments ORDER BY created_at DESC`;
    const res = await pool.query(query);
    return res.rows;
  }
}
