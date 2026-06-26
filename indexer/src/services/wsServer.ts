import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocketServer(): WebSocketServer {
  wss = new WebSocketServer({ port: config.wsPort });
  console.log(`WebSocket broadcast server running on ws://localhost:${config.wsPort}`);

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`New client connected. Total clients: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Client disconnected. Total clients: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('Client websocket error:', err);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEvent(event: any) {
  const payload = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error('Error broadcasting to client:', err);
      }
    }
  });
}

export function getActiveClientCount(): number {
  return clients.size;
}

export function closeWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!wss) {
      resolve();
      return;
    }
    clients.forEach((c) => c.close());
    clients.clear();
    wss.close(() => {
      wss = null;
      resolve();
    });
  });
}
