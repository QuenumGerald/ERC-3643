import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tokenization_engine',
  },
  
  blockchain: {
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    privateKey: process.env.PRIVATE_KEY || '',
    trexFactoryAddress: process.env.TREX_FACTORY_ADDRESS || '',
    identityFactoryAddress: process.env.IDENTITY_FACTORY_ADDRESS || '',
    implementationAuthorityAddress: process.env.IMPLEMENTATION_AUTHORITY_ADDRESS || '',
  }
};
