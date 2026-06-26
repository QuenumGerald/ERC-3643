import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase } from './db';
import tokenRouter from './routes/token';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', tokenRouter);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', env: config.nodeEnv });
});

// Initialize database and start server if run directly
if (require.main === module) {
  const PORT = config.port;
  
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[Server] Tokenization Engine running in ${config.nodeEnv} mode on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[Server] Failed to start due to database error:', err);
      process.exit(1);
    });
}

export default app;
