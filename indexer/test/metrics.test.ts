import { 
  incrementBlocks, 
  incrementEvents, 
  setIndexerLag, 
  triggerAlert, 
  startMetricsServer, 
  stopMetricsServer 
} from '../src/services/metrics';
import http from 'http';

// Mock prom-client
jest.mock('prom-client', () => {
  const mockCounter = jest.fn().mockImplementation(() => ({
    inc: jest.fn(),
  }));
  const mockGauge = jest.fn().mockImplementation(() => ({
    set: jest.fn(),
  }));
  return {
    Registry: jest.fn().mockImplementation(() => ({
      registerMetric: jest.fn(),
      contentType: 'text/plain',
      metrics: jest.fn().mockResolvedValue('mock_metrics_data'),
    })),
    collectDefaultMetrics: jest.fn(),
    Counter: mockCounter,
    Gauge: mockGauge,
  };
});

// Mock config
jest.mock('../src/config', () => ({
  config: {
    alertWebhookUrl: 'https://discord.com/api/webhooks/mock',
    metricsPort: 9999,
  },
}));

// Mock wsServer
jest.mock('../src/services/wsServer', () => ({
  getActiveClientCount: jest.fn().mockReturnValue(5),
}));

describe('Metrics Service Test Suite', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should increment blocks and events metrics without errors', () => {
    expect(() => incrementBlocks()).not.toThrow();
    expect(() => incrementEvents()).not.toThrow();
  });

  it('should set indexer lag without errors', () => {
    expect(() => setIndexerLag(10)).not.toThrow();
  });

  it('should trigger alert webhook when lag exceeds threshold and respects cooldown', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = mockFetch;

    // Trigger alert
    await triggerAlert('Test high latency');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/mock',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test high latency'),
      })
    );

    // Call again immediately to test cooldown (should not call fetch again)
    mockFetch.mockClear();
    await triggerAlert('Another latency alert');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should start and stop the metrics HTTP server successfully', async () => {
    const server = startMetricsServer();
    expect(server).toBeInstanceOf(http.Server);

    await stopMetricsServer();
  });
});
