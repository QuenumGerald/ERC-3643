import { initDatabase } from './services/db';
import { initWebSocketServer, closeWebSocketServer } from './services/wsServer';
import { setupListener, cleanup } from './services/listener';
import { startMetricsServer, stopMetricsServer } from './services/metrics';

async function main() {
  console.log('Starting ERC-3643 Indexer service...');
  
  try {
    // 1. Initialize DB tables
    await initDatabase();
    
    // 2. Initialize WebSocket broadcast server
    initWebSocketServer();
    
    // 3. Initialize metrics server
    startMetricsServer();
    
    // 4. Initialize blockchain listeners
    await setupListener();
    
    console.log('Indexer service successfully started.');
  } catch (error) {
    console.error('Fatal error starting Indexer service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down Indexer service gracefully...');
  cleanup();
  await closeWebSocketServer();
  await stopMetricsServer();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main();
