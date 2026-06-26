import { ethers, TransactionReceipt, Wallet, JsonRpcProvider } from 'ethers';
import { config } from '../config';
import TREXFactoryArtifact from '../../artifacts/contracts/factory/TREXFactory.sol/TREXFactory.json';
import TokenArtifact from '../../artifacts/contracts/token/Token.sol/Token.json';

export interface DeployParams {
  name: string;
  symbol: string;
  initialSupplyCap: string;
  trustedIssuers: string[];
  claimTopics: string[];
  complianceFlags?: {
    maxBalance?: string;
    countryWhitelist?: string[];
  };
}

export interface DeployResult {
  tokenAddress: string;
  identityRegistry: string;
  complianceAddress: string;
  txHash: string;
  blockNumber: number;
  abi: any[];
}

export class DeployerService {
  private provider: any;
  private wallet: Wallet;
  private factoryAddress: string;

  constructor(provider?: any) {
    this.provider = provider || new JsonRpcProvider(config.blockchain.rpcUrl);
    
    if (!config.blockchain.privateKey) {
      throw new Error('Blockchain private key is not configured');
    }
    this.wallet = new Wallet(config.blockchain.privateKey, this.provider);
    
    if (!config.blockchain.trexFactoryAddress) {
      throw new Error('TREX Factory address is not configured');
    }
    this.factoryAddress = config.blockchain.trexFactoryAddress;
  }

  /**
   * Helper to execute transactions with manual nonce tracking, dynamic gas price, retries, and confirmations.
   */
  private async executeTxWithRetry(
    fn: (nonce: number, gasOpts: any) => Promise<any>,
    maxRetries = 3
  ): Promise<TransactionReceipt> {
    let attempt = 0;
    let delay = 1000; // start with 1s backoff

    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`[Deployer] Attempt ${attempt} to execute transaction...`);

        // Fetch nonce (using pending status to account for unconfirmed txs)
        const nonce = await this.provider.getTransactionCount(this.wallet.address, 'pending');
        
        // Estimate gas fees (using EIP-1559 fees if available, else legacy)
        const feeData = await this.provider.getFeeData();
        
        const gasOpts: any = {
          nonce,
        };

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // Add 20% buffer to dynamic gas fees
          gasOpts.maxFeePerGas = (feeData.maxFeePerGas * 120n) / 100n;
          gasOpts.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * 120n) / 100n;
        } else if (feeData.gasPrice) {
          // Add 20% buffer to legacy gas price
          gasOpts.gasPrice = (feeData.gasPrice * 120n) / 100n;
        }

        // Run the contract call/tx submission function
        const tx = await fn(nonce, gasOpts);
        console.log(`[Deployer] Transaction submitted: ${tx.hash}. Waiting for confirmations...`);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);
        if (!receipt) {
          throw new Error('Transaction receipt was null');
        }

        console.log(`[Deployer] Transaction confirmed in block ${receipt.blockNumber}`);
        return receipt;
      } catch (error: any) {
        console.warn(`[Deployer] Transaction failed on attempt ${attempt}:`, error.message || error);
        
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Wait with backoff before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // double the backoff delay
      }
    }

    throw new Error('Transaction failed after maximum retries');
  }

  /**
   * Deploys an ERC-3643 Token Suite.
   */
  async deployToken(params: DeployParams): Promise<DeployResult> {
    const factory = new ethers.Contract(this.factoryAddress, TREXFactoryArtifact.abi, this.wallet);

    // Create unique salt
    const salt = ethers.id(`${params.name}-${params.symbol}-${Date.now()}`);

    // Map claim topics to BigInt
    // Zod validator ensures they are valid hexadecimal strings
    const mappedTopics = params.claimTopics.map((topic) => ethers.toBigInt(topic));
    
    // Each issuer is permitted to sign the specified claim topics
    const claimDetails = {
      claimTopics: mappedTopics,
      issuers: params.trustedIssuers,
      issuerClaims: params.trustedIssuers.map(() => mappedTopics),
    };

    const tokenDetails = {
      owner: this.wallet.address,
      name: params.name,
      symbol: params.symbol,
      decimals: 18, // standard ERC-20 decimals
      irs: ethers.ZeroAddress,
      ONCHAINID: ethers.ZeroAddress,
      irAgents: [this.wallet.address],
      tokenAgents: [this.wallet.address],
      complianceModules: [],
      complianceSettings: [],
    };

    console.log(`[Deployer] Deploying Token suite with TREXFactory. Name: ${params.name}, Symbol: ${params.symbol}`);

    const receipt = await this.executeTxWithRetry(async (nonce, gasOpts) => {
      // Estimate gas limit with a buffer
      const estimatedGas = await factory.deployTREXSuite.estimateGas(
        salt,
        tokenDetails,
        claimDetails,
        gasOpts
      );
      
      const txOpts = {
        ...gasOpts,
        gasLimit: (estimatedGas * 120n) / 100n, // add 20% gas limit buffer
      };

      return factory.deployTREXSuite(salt, tokenDetails, claimDetails, txOpts);
    });

    // Parse logs to extract addresses
    const factoryInterface = new ethers.Interface(TREXFactoryArtifact.abi);
    const eventTopic = factoryInterface.getEvent('TREXSuiteDeployed')?.topicHash;

    let tokenAddress = '';
    let identityRegistry = '';
    let complianceAddress = '';

    for (const log of receipt.logs) {
      if (log.topics[0] === eventTopic) {
        const decoded = factoryInterface.decodeEventLog('TREXSuiteDeployed', log.data, log.topics);
        tokenAddress = decoded._token;
        identityRegistry = decoded._ir;
        complianceAddress = decoded._mc;
        break;
      }
    }

    if (!tokenAddress) {
      throw new Error('Failed to find TREXSuiteDeployed event log in the transaction receipt');
    }

    console.log(`[Deployer] Tokenization Suite deployed:`);
    console.log(` - Token: ${tokenAddress}`);
    console.log(` - Identity Registry: ${identityRegistry}`);
    console.log(` - Modular Compliance: ${complianceAddress}`);

    return {
      tokenAddress,
      identityRegistry,
      complianceAddress,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      abi: TokenArtifact.abi,
    };
  }
}
