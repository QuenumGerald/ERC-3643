import { expect } from 'chai';
import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';
import { DeployerService } from '../src/services/deployer';
import { DbService } from '../src/services/db';
import { IpfsService } from '../src/services/ipfs';
import { config } from '../src/config';

// Mock DB and IPFS services to run blockchain tests without external dependencies
DbService.saveDeployment = async () => {
  console.log('[Mock DB] Saved deployment');
};
IpfsService.saveAndMockUpload = async (artifact) => {
  console.log('[Mock IPFS] Uploaded artifact');
  return {
    localPath: 'mock-path',
    ipfsHash: 'QmMockHash',
    ipfsUrl: 'https://ipfs.io/ipfs/QmMockHash',
  };
};

describe('Tokenization Engine - ERC-3643 Deployment & Compliance Tests', () => {
  let deployer: any;
  let tokenIssuer: any;
  let claimIssuer: any;
  let alice: any;
  let bob: any;

  let trexFactory: any;
  let identityFactory: any;
  let identityImplementationAuthority: any;
  let claimIssuerContract: any;
  let claimTopics: string[];

  before(async () => {
    [deployer, tokenIssuer, claimIssuer, alice, bob] = await ethers.getSigners();

    console.log('Deploying implementation contracts...');
    // Deploy ERC-3643 implementation contracts
    const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
    const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
    const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
    const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
    const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
    const tokenImplementation = await ethers.deployContract('Token', deployer);

    // Deploy OnchainID implementation
    const identityImplementation = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      deployer
    ).deploy(deployer.address, true);
    await identityImplementation.waitForDeployment();

    identityImplementationAuthority = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      deployer
    ).deploy(await identityImplementation.getAddress());
    await identityImplementationAuthority.waitForDeployment();

    identityFactory = await new ethers.ContractFactory(
      OnchainID.contracts.Factory.abi,
      OnchainID.contracts.Factory.bytecode,
      deployer
    ).deploy(await identityImplementationAuthority.getAddress());
    await identityFactory.waitForDeployment();

    // Deploy TREX Implementation Authority
    const trexImplementationAuthority = await ethers.deployContract(
      'TREXImplementationAuthority',
      [true, ethers.ZeroAddress, ethers.ZeroAddress],
      deployer
    );

    const versionStruct = { major: 4, minor: 0, patch: 0 };
    const contractsStruct = {
      tokenImplementation: await tokenImplementation.getAddress(),
      ctrImplementation: await claimTopicsRegistryImplementation.getAddress(),
      irImplementation: await identityRegistryImplementation.getAddress(),
      irsImplementation: await identityRegistryStorageImplementation.getAddress(),
      tirImplementation: await trustedIssuersRegistryImplementation.getAddress(),
      mcImplementation: await modularComplianceImplementation.getAddress(),
    };
    
    await trexImplementationAuthority.addAndUseTREXVersion(versionStruct, contractsStruct);

    // Deploy TREX Factory
    trexFactory = await ethers.deployContract(
      'TREXFactory',
      [await trexImplementationAuthority.getAddress(), await identityFactory.getAddress()],
      deployer
    );

    await identityFactory.addTokenFactory(await trexFactory.getAddress());

    // Update config to use local test deployment addresses
    config.blockchain.trexFactoryAddress = await trexFactory.getAddress();
    config.blockchain.identityFactoryAddress = await identityFactory.getAddress();
    config.blockchain.implementationAuthorityAddress = await trexImplementationAuthority.getAddress();
    
    // Configure private key in config to match deployer signer private key
    // Hardhat Account #0 private key
    config.blockchain.privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

    // Deploy ClaimIssuer contract
    claimIssuerContract = await ethers.deployContract('ClaimIssuer', [claimIssuer.address], claimIssuer);
    // Add key to claim issuer
    const claimIssuerSigningKey = ethers.Wallet.createRandom();
    const claimIssuerPublicKeyHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['address'], [claimIssuerSigningKey.address])
    );
    await claimIssuerContract.connect(claimIssuer).addKey(claimIssuerPublicKeyHash, 3, 1);

    claimTopics = [ethers.id('KYC_CLAIM')];

    // Expose signing key and addresses for usage in tests
    (global as any).claimIssuerSigningKey = claimIssuerSigningKey;
    (global as any).claimIssuerContractAddress = await claimIssuerContract.getAddress();
  });

  describe('Token deployment and transfers tests', () => {
    let tokenAddress: string;
    let identityRegistryAddress: string;
    let complianceAddress: string;
    let tokenContract: any;
    let identityRegistryContract: any;

    it('should successfully deploy an ERC-3643 token via the DeployerService', async () => {
      const deployerService = new DeployerService(ethers.provider);
      
      const result = await deployerService.deployToken({
        name: 'Test Compliance Token',
        symbol: 'TCT',
        initialSupplyCap: '1000000000000000000000000', // 1,000,000 tokens
        trustedIssuers: [await claimIssuerContract.getAddress()],
        claimTopics: claimTopics,
      });

      expect(result.tokenAddress).to.not.be.empty;
      expect(result.identityRegistry).to.not.be.empty;
      expect(result.complianceAddress).to.not.be.empty;

      tokenAddress = result.tokenAddress;
      identityRegistryAddress = result.identityRegistry;
      complianceAddress = result.complianceAddress;

      tokenContract = await ethers.getContractAt('Token', tokenAddress);
      identityRegistryContract = await ethers.getContractAt('IdentityRegistry', identityRegistryAddress);
    });

    it('should prevent minting to an address without a verified identity', async () => {
      // Alice currently has no registered identity
      await expect(
        tokenContract.connect(deployer).mint(alice.address, 1000)
      ).to.be.revertedWith('Identity is not verified.');
    });

    it('should allow minting once identity is verified, but prevent transfer if recipient is not verified', async () => {
      // 1. Deploy Identity Proxies for Alice and Bob using OnchainID bytecode
      const aliceIdentityProxy = await new ethers.ContractFactory(
        OnchainID.contracts.IdentityProxy.abi,
        OnchainID.contracts.IdentityProxy.bytecode,
        deployer
      ).deploy(await identityImplementationAuthority.getAddress(), alice.address);
      await aliceIdentityProxy.waitForDeployment();

      const bobIdentityProxy = await new ethers.ContractFactory(
        OnchainID.contracts.IdentityProxy.abi,
        OnchainID.contracts.IdentityProxy.bytecode,
        deployer
      ).deploy(await identityImplementationAuthority.getAddress(), bob.address);
      await bobIdentityProxy.waitForDeployment();

      // 2. Register Alice and Bob's identities in the Identity Registry
      await identityRegistryContract.connect(deployer).batchRegisterIdentity(
        [alice.address, bob.address],
        [await aliceIdentityProxy.getAddress(), await bobIdentityProxy.getAddress()],
        [100, 100] // country codes (e.g. 100 for France)
      );

      // 3. Alice tries to mint -> Still fails because she has no valid KYC claim yet
      await expect(
        tokenContract.connect(deployer).mint(alice.address, 1000)
      ).to.be.revertedWith('Identity is not verified.');

      // 4. Create and add KYC claim signed by the trusted issuer for Alice
      const claimIssuerSigningKey = (global as any).claimIssuerSigningKey;
      const claimIssuerContractAddress = (global as any).claimIssuerContractAddress;

      const aliceClaimData = ethers.hexlify(ethers.toUtf8Bytes('Alice KYC Verified'));
      const aliceClaimHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [await aliceIdentityProxy.getAddress(), claimTopics[0], aliceClaimData]
        )
      );
      const aliceSignature = await claimIssuerSigningKey.signMessage(ethers.toBeArray(aliceClaimHash));

      const aliceIdentityContract = (await ethers.getContractAt('Identity', await aliceIdentityProxy.getAddress())) as any;
      await aliceIdentityContract.connect(alice).addClaim(
        claimTopics[0],
        1, // Scheme
        claimIssuerContractAddress,
        aliceSignature,
        aliceClaimData,
        ''
      );

      // 5. Now minting to Alice should succeed!
      await tokenContract.connect(deployer).mint(alice.address, 1000);
      expect(await tokenContract.balanceOf(alice.address)).to.equal(1000n);

      // Unpause the token to allow transfers
      await tokenContract.connect(deployer).unpause();

      // 6. Alice tries to transfer to Bob -> Should fail because Bob has no claim (not verified)
      await expect(
        tokenContract.connect(alice).transfer(bob.address, 100)
      ).to.be.revertedWith('Transfer not possible');
    });

    it('should allow transfer once recipient identity is also verified', async () => {
      const claimIssuerSigningKey = (global as any).claimIssuerSigningKey;
      const claimIssuerContractAddress = (global as any).claimIssuerContractAddress;

      // Find Bob's identity address in the identity registry
      const bobIdentityAddress = await identityRegistryContract.identity(bob.address);
      const bobIdentityContract = (await ethers.getContractAt('Identity', bobIdentityAddress)) as any;

      // Create and add KYC claim signed by the trusted issuer for Bob
      const bobClaimData = ethers.hexlify(ethers.toUtf8Bytes('Bob KYC Verified'));
      const bobClaimHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'bytes'],
          [bobIdentityAddress, claimTopics[0], bobClaimData]
        )
      );
      const bobSignature = await claimIssuerSigningKey.signMessage(ethers.toBeArray(bobClaimHash));

      await bobIdentityContract.connect(bob).addClaim(
        claimTopics[0],
        1, // Scheme
        claimIssuerContractAddress,
        bobSignature,
        bobClaimData,
        ''
      );

      // Alice transfers tokens to Bob -> Should now succeed
      const tx = await tokenContract.connect(alice).transfer(bob.address, 100);
      await tx.wait();

      expect(await tokenContract.balanceOf(alice.address)).to.equal(900n);
      expect(await tokenContract.balanceOf(bob.address)).to.equal(100n);
      console.log('Transfer from Alice to Bob succeeded!');
    });
  });
});
