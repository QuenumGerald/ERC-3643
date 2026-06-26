import dotenv from 'dotenv';
import path from 'path';

// Load environmental variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'tokenization_engine',
  },
  blockchain: {
    rpcWsUrl: process.env.RPC_WS_URL || 'ws://127.0.0.1:8545',
  },
  wsPort: parseInt(process.env.WS_PORT || '4000', 10),
  metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || '',
};
