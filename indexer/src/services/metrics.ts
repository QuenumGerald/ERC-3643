import http from 'http';
import client from 'prom-client';
import { config } from '../config';
import { getActiveClientCount } from './wsServer';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom Prometheus metrics
const indexedBlocksTotal = new client.Counter({
  name: 'indexer_blocks_indexed_total',
  help: 'Total number of blocks indexed/processed by the listener',
});

const indexedEventsTotal = new client.Counter({
  name: 'indexer_events_indexed_total',
  help: 'Total number of ERC-3643 events indexed',
});

const activeWsConnections = new client.Gauge({
  name: 'indexer_websocket_connections_active',
  help: 'Number of active websocket clients connected to the indexer',
});

const indexerLag = new client.Gauge({
  name: 'indexer_lag_seconds',
  help: 'Time difference in seconds between current time and the latest block/event timestamp',
});

register.registerMetric(indexedBlocksTotal);
register.registerMetric(indexedEventsTotal);
register.registerMetric(activeWsConnections);
register.registerMetric(indexerLag);

let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown

/**
 * Triggers a webhook alert (Slack/Discord format) if config.alertWebhookUrl is set.
 */
export async function triggerAlert(message: string): Promise<void> {
  const url = config.alertWebhookUrl;
  if (!url) return;

  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    // Cooldown active, skip to prevent spamming
    return;
  }

  lastAlertTime = now;
  console.log(`[Alerting] Sending webhook alert: "${message}"`);

  try {
    const payload = JSON.stringify({
      text: `🚨 *ERC-3643 INDEXER ALERT* 🚨\n${message}\nTime: ${new Date().toISOString()}`,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    if (!response.ok) {
      console.error(`[Alerting] Failed to send webhook alert, status: ${response.status}`);
    }
  } catch (err) {
    console.error('[Alerting] Error sending webhook alert:', err);
  }
}

/**
 * Metric helper functions
 */
export function incrementBlocks() {
  indexedBlocksTotal.inc(1);
}

export function incrementEvents() {
  indexedEventsTotal.inc(1);
}

export function setIndexerLag(seconds: number) {
  indexerLag.set(seconds);
  if (seconds > 30) {
    triggerAlert(`Indexer lag exceeds threshold: ${seconds.toFixed(1)} seconds delay detected!`);
  }
}

/**
 * Starts the Prometheus HTTP metrics server.
 */
let metricsServer: http.Server | null = null;

export function startMetricsServer(): http.Server {
  metricsServer = http.createServer(async (req, res) => {
    // Update active WS connections gauge on demand
    activeWsConnections.set(getActiveClientCount());

    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  metricsServer.listen(config.metricsPort, () => {
    console.log(`Prometheus metrics server running on http://localhost:${config.metricsPort}/metrics`);
  });

  return metricsServer;
}

export function stopMetricsServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!metricsServer) {
      resolve();
      return;
    }
    metricsServer.close(() => {
      metricsServer = null;
      resolve();
    });
  });
}
