import { setupListener, cleanup } from '../src/services/listener';
import * as db from '../src/services/db';
import * as wsServer from '../src/services/wsServer';
import { ethers } from 'ethers';

// Mock dependencies
jest.mock('../src/services/db', () => ({
  fetchDeployedTokens: jest.fn(),
  insertTransfer: jest.fn(),
  updateConfirmations: jest.fn(),
}));

jest.mock('../src/services/wsServer', () => ({
  broadcastEvent: jest.fn(),
}));

// Mock ethers
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  
  // Custom mock for provider.on
  const mockOn = jest.fn();
  const mockGetBlock = jest.fn().mockResolvedValue({
    timestamp: 1719430000 // Friday, June 26, 2026
  });
  
  class MockWebSocketProvider {
    websocket = {
      onclose: null
    };
    on = mockOn;
    getBlock = mockGetBlock;
    removeAllListeners = jest.fn();
    destroy = jest.fn();
  }

  const mockEthers = {
    ...(original.ethers || original),
    WebSocketProvider: MockWebSocketProvider,
  };

  return {
    ...original,
    ethers: mockEthers,
    WebSocketProvider: MockWebSocketProvider,
  };
});

describe('Indexer Listener Test Suite', () => {
  let mockProviderInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should register a Transfer event listener for all deployed tokens', async () => {
    const mockTokens = [
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
    ];
    (db.fetchDeployedTokens as jest.Mock).mockResolvedValue(mockTokens);

    await setupListener();

    // Verify tokens were retrieved
    expect(db.fetchDeployedTokens).toHaveBeenCalled();

    // Verify provider.on was registered with the filter
    const ethersMock = require('ethers');
    const tempProvider = new ethersMock.WebSocketProvider('ws://mock');
    expect(tempProvider.on).toHaveBeenCalledWith(
      expect.objectContaining({
        address: mockTokens,
        topics: [expect.any(String)]
      }),
      expect.any(Function)
    );
  });

  it('should process events, insert them into DB, and broadcast via WebSocket', async () => {
    const mockTokens = ['0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'];
    (db.fetchDeployedTokens as jest.Mock).mockResolvedValue(mockTokens);
    (db.insertTransfer as jest.Mock).mockResolvedValue(42); // mock database row ID

    // Capture the listener callback from provider.on mock
    let eventCallback: Function | null = null;
    const ethersMock = require('ethers');
    const tempProvider = new ethersMock.WebSocketProvider('ws://mock');
    
    (tempProvider.on as jest.Mock).mockImplementation((filter, callback) => {
      eventCallback = callback;
    });

    await setupListener();

    // Ensure our setup registered the callback
    expect(eventCallback).toBeDefined();

    // Simulate an ERC-3643 Transfer Event log received from blockchain
    const mockLog = {
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      transactionHash: '0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1',
      blockNumber: 154321,
      // Padded topic parameters: Transfer(from, to, value)
      topics: [
        ethers.id('Transfer(address,address,uint256)'),
        ethers.zeroPadValue('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 32),
        ethers.zeroPadValue('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', 32)
      ],
      // Log data: encoded uint256 amount (e.g. 1000 tokens)
      data: ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [ethers.parseUnits('1000', 18)])
    };

    // Execute mock event callback
    await eventCallback!(mockLog);

    // Assert database insertion is triggered with correct fields
    expect(db.insertTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        value: ethers.parseUnits('1000', 18).toString(),
        compliant: true,
        txHash: mockLog.transactionHash,
        block: mockLog.blockNumber,
        timestamp: expect.any(Date)
      })
    );

    // Assert WS broadcast is triggered
    expect(wsServer.broadcastEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        type: 'Transfer',
        tokenAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        amount: '1000.0',
        txHash: mockLog.transactionHash,
        block: mockLog.blockNumber,
        status: 'SUCCESS'
      })
    );
  });
});
