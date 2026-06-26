import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface TokenArtifact {
  tokenAddress: string;
  abi: any[];
  chainId: number;
}

export class IpfsService {
  static async saveAndMockUpload(artifact: TokenArtifact): Promise<{ localPath: string; ipfsHash: string; ipfsUrl: string }> {
    const publishedDir = path.join(__dirname, '../../published');
    if (!fs.existsSync(publishedDir)) {
      fs.mkdirSync(publishedDir, { recursive: true });
    }

    const filename = `${artifact.chainId}_${artifact.tokenAddress.toLowerCase()}.json`;
    const localPath = path.join(publishedDir, filename);

    // Save locally
    fs.writeFileSync(localPath, JSON.stringify(artifact, null, 2));

    // Mock IPFS upload: generate a sha256 hash formatted like an IPFS CIDv0
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
    const mockCid = `Qm${contentHash.substring(0, 44)}`;
    const ipfsUrl = `https://ipfs.io/ipfs/${mockCid}`;

    console.log(`[IPFS Mock] Saved local artifact to: ${localPath}`);
    console.log(`[IPFS Mock] Uploaded to IPFS. CID: ${mockCid}`);

    return {
      localPath,
      ipfsHash: mockCid,
      ipfsUrl,
    };
  }
}
