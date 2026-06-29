import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authMiddleware } from '../middlewares/auth';
import { DeployerService } from '../services/deployer';
import { DbService } from '../services/db';
import { IpfsService } from '../services/ipfs';

const router = Router();

// Zod Input Validation Schema
const deployTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
  symbol: z.string().min(1, 'Token symbol is required'),
  initialSupplyCap: z.string().refine(
    (val) => {
      try {
        BigInt(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'initialSupplyCap must be a valid numeric string representing uint256' }
  ),
  // Array of valid Ethereum addresses
  trustedIssuers: z.array(
    z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address for trusted issuer' })
  ),
  // Array of 32-byte claim topic hashes or numerical values formatted as hex
  claimTopics: z.array(
    z.string().regex(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid 32-byte hex string for claim topic' })
  ),
  complianceFlags: z
    .object({
      maxBalance: z.string().optional(),
      countryWhitelist: z.array(z.string()).optional(),
    })
    .optional(),
});

router.post(
  '/deployToken',
  authMiddleware(['ADMIN', 'ISSUER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request body
      const parsedBody = deployTokenSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsedBody.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const params = parsedBody.data;

      // Deploy token via the blockchain deployer service
      const deployer = new DeployerService();
      const deployResult = await deployer.deployToken({
        name: params.name,
        symbol: params.symbol,
        initialSupplyCap: params.initialSupplyCap,
        trustedIssuers: params.trustedIssuers,
        claimTopics: params.claimTopics,
        complianceFlags: params.complianceFlags,
      });

      // Save to database
      await DbService.saveDeployment({
        chainId: 1337, // Local Dev Hardhat Chain ID by default
        tokenAddress: deployResult.tokenAddress,
        identityRegistry: deployResult.identityRegistry,
        complianceAddress: deployResult.complianceAddress,
        owner: req.user!.issuerId,
        params,
        txHash: deployResult.txHash,
        block: deployResult.blockNumber,
      });

      // Generate artifact, save local, mock IPFS upload
      const ipfsResult = await IpfsService.saveAndMockUpload({
        tokenAddress: deployResult.tokenAddress,
        abi: deployResult.abi,
        chainId: 1337,
      });

      return res.status(201).json({
        success: true,
        message: 'Token deployed successfully',
        data: {
          tokenAddress: deployResult.tokenAddress,
          identityRegistry: deployResult.identityRegistry,
          complianceAddress: deployResult.complianceAddress,
          txHash: deployResult.txHash,
          blockNumber: deployResult.blockNumber,
          ipfs: {
            hash: ipfsResult.ipfsHash,
            url: ipfsResult.ipfsUrl,
            localPath: ipfsResult.localPath,
          },
        },
      });
    } catch (error: any) {
      console.error('Error deploying token:', error);
      return res.status(500).json({
        error: 'Failed to deploy token',
        message: error.message || error,
      });
    }
  }
);

// Zod schemas for operational routes
const mintSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid token address' }),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid recipient address' }),
  amount: z.string().min(1, 'Amount is required')
});

const burnSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid token address' }),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid sender address' }),
  amount: z.string().min(1, 'Amount is required')
});

const freezeSchema = z.object({
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid token address' }),
  investorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid investor address' }),
  freeze: z.boolean()
});

// GET all deployments
router.get(
  '/deployments',
  authMiddleware(['ADMIN', 'ISSUER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deployments = await DbService.getAllDeployments();
      return res.json({ success: true, data: deployments });
    } catch (error: any) {
      console.error('Error fetching deployments:', error);
      return res.status(500).json({ error: 'Failed to fetch deployments', message: error.message || error });
    }
  }
);

// POST mint tokens
router.post(
  '/mint',
  authMiddleware(['ADMIN', 'ISSUER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsedBody = mintSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsedBody.error.errors });
      }
      const { tokenAddress, to, amount } = parsedBody.data;

      const deployer = new DeployerService();
      const receipt = await deployer.mint(tokenAddress, to, amount);

      return res.json({
        success: true,
        message: 'Tokens minted successfully',
        data: {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber
        }
      });
    } catch (error: any) {
      console.error('Error minting tokens:', error);
      return res.status(500).json({ error: 'Failed to mint tokens', message: error.message || error });
    }
  }
);

// POST burn tokens
router.post(
  '/burn',
  authMiddleware(['ADMIN', 'ISSUER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsedBody = burnSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsedBody.error.errors });
      }
      const { tokenAddress, from, amount } = parsedBody.data;

      const deployer = new DeployerService();
      const receipt = await deployer.burn(tokenAddress, from, amount);

      return res.json({
        success: true,
        message: 'Tokens burned successfully',
        data: {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber
        }
      });
    } catch (error: any) {
      console.error('Error burning tokens:', error);
      return res.status(500).json({ error: 'Failed to burn tokens', message: error.message || error });
    }
  }
);

// POST freeze wallet
router.post(
  '/freeze',
  authMiddleware(['ADMIN', 'ISSUER']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsedBody = freezeSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsedBody.error.errors });
      }
      const { tokenAddress, investorAddress, freeze } = parsedBody.data;

      const deployer = new DeployerService();
      const receipt = await deployer.setAddressFrozen(tokenAddress, investorAddress, freeze);

      return res.json({
        success: true,
        message: `Wallet ${freeze ? 'frozen' : 'unfrozen'} successfully`,
        data: {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber
        }
      });
    } catch (error: any) {
      console.error('Error modifying wallet freeze status:', error);
      return res.status(500).json({ error: 'Failed to modify wallet status', message: error.message || error });
    }
  }
);

export default router;

