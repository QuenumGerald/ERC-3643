import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('=== Deploying ERC-3643 Suite to Public Network ===');
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);

  console.log('1. Deploying Implementations...');
  
  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  await claimTopicsRegistryImplementation.deployed();
  console.log(`- ClaimTopicsRegistry Implementation: ${claimTopicsRegistryImplementation.address}`);

  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  await trustedIssuersRegistryImplementation.deployed();
  console.log(`- TrustedIssuersRegistry Implementation: ${trustedIssuersRegistryImplementation.address}`);

  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  await identityRegistryStorageImplementation.deployed();
  console.log(`- IdentityRegistryStorage Implementation: ${identityRegistryStorageImplementation.address}`);

  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  await identityRegistryImplementation.deployed();
  console.log(`- IdentityRegistry Implementation: ${identityRegistryImplementation.address}`);

  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  await modularComplianceImplementation.deployed();
  console.log(`- ModularCompliance Implementation: ${modularComplianceImplementation.address}`);

  const tokenImplementation = await ethers.deployContract('Token', deployer);
  await tokenImplementation.deployed();
  console.log(`- Token Implementation: ${tokenImplementation.address}`);

  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer,
  ).deploy(deployer.address, true);
  await identityImplementation.deployed();
  console.log(`- Identity Implementation: ${identityImplementation.address}`);

  console.log('2. Deploying Identity Authorities & Factory...');
  
  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer,
  ).deploy(identityImplementation.address);
  await identityImplementationAuthority.deployed();
  console.log(`- Identity ImplementationAuthority: ${identityImplementationAuthority.address}`);

  const identityFactory = await new ethers.ContractFactory(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode,
    deployer,
  ).deploy(identityImplementationAuthority.address);
  await identityFactory.deployed();
  console.log(`- Identity Factory: ${identityFactory.address}`);

  console.log('3. Deploying TREX Implementation Authority...');
  
  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
    deployer,
  );
  await trexImplementationAuthority.deployed();
  console.log(`- TREXImplementationAuthority: ${trexImplementationAuthority.address}`);

  const versionStruct = {
    major: 4,
    minor: 0,
    patch: 0,
  };
  const contractsStruct = {
    tokenImplementation: tokenImplementation.address,
    ctrImplementation: claimTopicsRegistryImplementation.address,
    irImplementation: identityRegistryImplementation.address,
    irsImplementation: identityRegistryStorageImplementation.address,
    tirImplementation: trustedIssuersRegistryImplementation.address,
    mcImplementation: modularComplianceImplementation.address,
  };

  const tx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  await tx.wait();
  console.log('Linked version 4.0.0 to TREXImplementationAuthority');

  console.log('4. Deploying TREX Factory...');
  
  const trexFactory = await ethers.deployContract(
    'TREXFactory', 
    [trexImplementationAuthority.address, identityFactory.address], 
    deployer
  );
  await trexFactory.deployed();
  console.log(`- TREXFactory: ${trexFactory.address}`);

  const txLink = await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
  await txLink.wait();
  console.log('Linked TREXFactory as TokenFactory in IdentityFactory');

  console.log('=== Deployment Complete ===');
  console.log(JSON.stringify({
    trexFactory: trexFactory.address,
    trexImplementationAuthority: trexImplementationAuthority.address,
    identityFactory: identityFactory.address,
    identityImplementationAuthority: identityImplementationAuthority.address,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
