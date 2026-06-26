import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('=== Deploying ERC-3643 Suite to Public Network ===');
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);

  const isSepolia = network.name === 'sepolia';
  
  let claimTopicsRegistryAddress = '';
  let trustedIssuersRegistryAddress = '';
  let identityRegistryStorageAddress = '';
  let identityRegistryAddress = '';
  let modularComplianceAddress = '';
  let tokenAddress = '';
  let identityAddress = '';
  let identityImplementationAuthorityAddress = '';
  let identityFactoryAddress = '';
  let trexImplementationAuthorityAddress = '';

  if (isSepolia) {
    claimTopicsRegistryAddress = '0x38CCa583D937a9cd460aa3C8B74e256390d7F96e';
    trustedIssuersRegistryAddress = '0xeD0909bb17aE22997489001305713ac5aE1b3724';
    identityRegistryStorageAddress = '0x3B3381eEb554155E413A6e7545f852cB165F3d66';
    identityRegistryAddress = '0x55c20A6Da033c0F97210eF2b8667941b4E6cf6D3';
    modularComplianceAddress = '0xE0D59015b5FAEf3a617395F72D53152bf169De69';
    tokenAddress = '0xB87EBf4dAa7190204401F566d619b89b94Ddc61e';
    identityAddress = '0xFF99b7c42aA5477bb311E255807791fD15201CDD';
    identityImplementationAuthorityAddress = '0x16Bc9e9f5893636df30f324B4b3f51f6E37dB399';
    identityFactoryAddress = '0x4AB5a3008550217F246cc71f017ed1AB4569317A';
    trexImplementationAuthorityAddress = '0xB9D8856e28f3769f025F26Dec753c05a53ae9783';
    console.log('Reusing existing Sepolia deployments to save gas.');
  }

  // 1. Deploy Implementations if not already set
  if (!claimTopicsRegistryAddress) {
    const impl = await ethers.deployContract('ClaimTopicsRegistry', deployer);
    await impl.deployed();
    claimTopicsRegistryAddress = impl.address;
    console.log(`- ClaimTopicsRegistry Implementation: ${claimTopicsRegistryAddress}`);
  }
  if (!trustedIssuersRegistryAddress) {
    const impl = await ethers.deployContract('TrustedIssuersRegistry', deployer);
    await impl.deployed();
    trustedIssuersRegistryAddress = impl.address;
    console.log(`- TrustedIssuersRegistry Implementation: ${trustedIssuersRegistryAddress}`);
  }
  if (!identityRegistryStorageAddress) {
    const impl = await ethers.deployContract('IdentityRegistryStorage', deployer);
    await impl.deployed();
    identityRegistryStorageAddress = impl.address;
    console.log(`- IdentityRegistryStorage Implementation: ${identityRegistryStorageAddress}`);
  }
  if (!identityRegistryAddress) {
    const impl = await ethers.deployContract('IdentityRegistry', deployer);
    await impl.deployed();
    identityRegistryAddress = impl.address;
    console.log(`- IdentityRegistry Implementation: ${identityRegistryAddress}`);
  }
  if (!modularComplianceAddress) {
    const impl = await ethers.deployContract('ModularCompliance', deployer);
    await impl.deployed();
    modularComplianceAddress = impl.address;
    console.log(`- ModularCompliance Implementation: ${modularComplianceAddress}`);
  }
  if (!tokenAddress) {
    const impl = await ethers.deployContract('Token', deployer);
    await impl.deployed();
    tokenAddress = impl.address;
    console.log(`- Token Implementation: ${tokenAddress}`);
  }
  if (!identityAddress) {
    const impl = await new ethers.ContractFactory(
      OnchainID.contracts.Identity.abi,
      OnchainID.contracts.Identity.bytecode,
      deployer,
    ).deploy(deployer.address, true);
    await impl.deployed();
    identityAddress = impl.address;
    console.log(`- Identity Implementation: ${identityAddress}`);
  }

  // 2. Deploy Identity Authorities & Factory
  if (!identityImplementationAuthorityAddress) {
    const impl = await new ethers.ContractFactory(
      OnchainID.contracts.ImplementationAuthority.abi,
      OnchainID.contracts.ImplementationAuthority.bytecode,
      deployer,
    ).deploy(identityAddress);
    await impl.deployed();
    identityImplementationAuthorityAddress = impl.address;
    console.log(`- Identity ImplementationAuthority: ${identityImplementationAuthorityAddress}`);
  }
  if (!identityFactoryAddress) {
    const impl = await new ethers.ContractFactory(
      OnchainID.contracts.Factory.abi,
      OnchainID.contracts.Factory.bytecode,
      deployer,
    ).deploy(identityImplementationAuthorityAddress);
    await impl.deployed();
    identityFactoryAddress = impl.address;
    console.log(`- Identity Factory: ${identityFactoryAddress}`);
  }

  // 3. Deploy TREX Implementation Authority
  if (!trexImplementationAuthorityAddress) {
    const impl = await ethers.deployContract(
      'TREXImplementationAuthority',
      [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
      deployer,
    );
    await impl.deployed();
    trexImplementationAuthorityAddress = impl.address;
    console.log(`- TREXImplementationAuthority: ${trexImplementationAuthorityAddress}`);
  }

  const trexImplementationAuthority = await ethers.getContractAt('TREXImplementationAuthority', trexImplementationAuthorityAddress, deployer);
  
  const versionStruct = {
    major: 4,
    minor: 0,
    patch: 0,
  };
  const contractsStruct = {
    tokenImplementation: tokenAddress,
    ctrImplementation: claimTopicsRegistryAddress,
    irImplementation: identityRegistryAddress,
    irsImplementation: identityRegistryStorageAddress,
    tirImplementation: trustedIssuersRegistryAddress,
    mcImplementation: modularComplianceAddress,
  };

  try {
    const tx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
    await tx.wait();
    console.log('Linked version 4.0.0 to TREXImplementationAuthority');
  } catch (err: any) {
    console.log('Version link step skipped or already executed:', err.message || err);
  }

  console.log('3. Deploying TREX Factory...');
  const trexFactory = await ethers.deployContract(
    'TREXFactory', 
    [trexImplementationAuthorityAddress, identityFactoryAddress], 
    deployer
  );
  await trexFactory.deployed();
  console.log(`- TREXFactory: ${trexFactory.address}`);

  console.log('4. Linking TREXFactory as TokenFactory in IdentityFactory...');
  const identityFactory = new ethers.Contract(
    identityFactoryAddress,
    OnchainID.contracts.Factory.abi,
    deployer
  );
  
  const txLink = await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
  await txLink.wait();
  console.log('Linked TREXFactory as TokenFactory in IdentityFactory');

  console.log('=== Deployment Complete ===');
  console.log(JSON.stringify({
    trexFactory: trexFactory.address,
    trexImplementationAuthority: trexImplementationAuthorityAddress,
    identityFactory: identityFactoryAddress,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
