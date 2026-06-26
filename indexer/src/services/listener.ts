import { ethers } from 'ethers';
import { config } from '../config';
import { fetchDeployedTokens, insertTransfer, updateConfirmations, DBTransfer } from './db';
import { broadcastEvent } from './wsServer';
import { incrementBlocks, incrementEvents, setIndexerLag } from './metrics';

let provider: ethers.WebSocketProvider | ethers.JsonRpcProvider | null = null;
let activeFilters: any[] = [];
let confirmationTimer: NodeJS.Timeout | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

// Simple block timestamp cache to minimize RPC calls
const blockTimestampCache = new Map<number, Date>();

async function getBlockTimestamp(blockNumber: number): Promise<Date> {
  if (blockTimestampCache.has(blockNumber)) {
    return blockTimestampCache.get(blockNumber)!;
  }
  
  try {
    if (!provider) throw new Error('Provider not initialized');
    const block = await provider.getBlock(blockNumber);
    const timestamp = block ? new Date(block.timestamp * 1000) : new Date();
    blockTimestampCache.set(blockNumber, timestamp);
    return timestamp;
  } catch (err) {
    console.error(`Error getting block timestamp for block ${blockNumber}:`, err);
    return new Date();
  }
}

export async function setupListener() {
  const tokenAddresses = await fetchDeployedTokens();
  console.log(`Listening for Transfer events on ${tokenAddresses.length} deployed tokens:`, tokenAddresses);

  if (tokenAddresses.length === 0) {
    return;
  }

  try {
    // Check if it's a websocket URL
    if (config.blockchain.rpcWsUrl.startsWith('ws://') || config.blockchain.rpcWsUrl.startsWith('wss://')) {
      const wsProvider = new ethers.WebSocketProvider(config.blockchain.rpcWsUrl);
      provider = wsProvider;

      // Handle websocket close event for auto-reconnection
      (wsProvider.websocket as any).onclose = () => {
        console.warn('Alchemy WebSocket RPC connection dropped. Reconnecting in 5 seconds...');
        cleanup();
        setTimeout(setupListener, 5000);
      };
    } else {
      // Fallback to standard HTTP Provider for development or local RPC nodes
      provider = new ethers.JsonRpcProvider(config.blockchain.rpcWsUrl);
      console.log('Using standard HTTP JSON-RPC provider fallback');
    }

    // ERC-3643 Standard transfer signature
    // Transfer(address indexed from, address indexed to, uint256 value)
    const transferEventSignature = 'Transfer(address,address,uint256)';
    const transferEventTopic = ethers.id(transferEventSignature);

    // Dynamic filter for all deployed tokens
    const filter = {
      address: tokenAddresses,
      topics: [transferEventTopic]
    };

    // Store filters to allow unregistering on cleanups
    activeFilters.push(filter);

    // Register event listener
    provider.on(filter, async (log: any) => {
      try {
        const txHash = log.transactionHash;
        const blockNumber = log.blockNumber;
        const tokenAddress = log.address;
        
        // Parse topic arguments
        // Topic 0: event signature
        // Topic 1: from address (padded)
        // Topic 2: to address (padded)
        const from = ethers.getAddress('0x' + log.topics[1].slice(26));
        const to = ethers.getAddress('0x' + log.topics[2].slice(26));
        
        // Data: value
        const value = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], log.data)[0].toString();
        const timestamp = await getBlockTimestamp(blockNumber);

        // All successful on-chain transfers in ERC-3643 are compliant by definition (else they revert)
        const compliant = true;
        
        // Calculate and set indexing lag
        const lagSeconds = (Date.now() - timestamp.getTime()) / 1000;
        setIndexerLag(lagSeconds);

        const transferRecord: DBTransfer = {
          tokenAddress,
          from,
          to,
          value,
          compliant,
          txHash,
          block: blockNumber,
          timestamp
        };

        // Persist to Postgres
        const dbId = await insertTransfer(transferRecord);
        console.log(`Indexed Transfer: tx ${txHash.slice(0, 10)}... (DB ID: ${dbId})`);

        // Broadcast to WebSocket clients
        broadcastEvent({
          id: dbId,
          type: 'Transfer',
          tokenAddress,
          from,
          to,
          amount: ethers.formatUnits(value, 18), // assuming 18 decimals
          txHash,
          block: blockNumber,
          timestamp: timestamp.toISOString(),
          status: 'SUCCESS'
        });

        // Record metrics
        incrementEvents();

      } catch (err) {
        console.error('Failed to process Transfer event log:', err);
      }
    });

    // Start periodic 12-block confirmation checker
    startConfirmationChecker();

  } catch (error) {
    console.error('Failed to set up RPC event listener:', error);
    // Retry setup after 10s
    setTimeout(setupListener, 10000);
  }
}

let lastCheckedBlock = 0;

function startConfirmationChecker() {
  if (confirmationTimer) clearInterval(confirmationTimer);

  confirmationTimer = setInterval(async () => {
    if (!provider) return;
    try {
      const latestBlock = await provider.getBlockNumber();
      if (lastCheckedBlock > 0 && latestBlock > lastCheckedBlock) {
        for (let i = 0; i < latestBlock - lastCheckedBlock; i++) {
          incrementBlocks();
        }
      }
      lastCheckedBlock = latestBlock;

      const updatedRows = await updateConfirmations(latestBlock, 12);
      if (updatedRows > 0) {
        console.log(`Updated confirmations for ${updatedRows} transfers up to block ${latestBlock}.`);
      }
    } catch (err) {
      console.error('Error running confirmations checker:', err);
    }
  }, 15000); // run every 15s
}

export function cleanup() {
  if (confirmationTimer) {
    clearInterval(confirmationTimer);
    confirmationTimer = null;
  }
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
  if (provider) {
    try {
      provider.removeAllListeners();
      if (provider instanceof ethers.WebSocketProvider) {
        provider.destroy();
      }
    } catch (err) {
      console.error('Error during provider cleanup:', err);
    }
    provider = null;
  }
  activeFilters = [];
}
