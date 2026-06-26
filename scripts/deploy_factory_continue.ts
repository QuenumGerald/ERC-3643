import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('=== Continuing ERC-3643 Suite Deployment ===');
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Existing addresses from previous run
  const tokenImplementation = '0xB87EBf4dAa7190204401F566d619b89b94Ddc61e';
  const claimTopicsRegistryImplementation = '0x38CCa583D937a9cd460aa3C8B74e256390d7F96e';
  const identityRegistryImplementation = '0x55c20A6Da033c0F97210eF2b8667941b4E6cf6D3';
  const identityRegistryStorageImplementation = '0x3B3381eEb554155E413A6e7545f852cB165F3d66';
  const trustedIssuersRegistryImplementation = '0xeD0909bb17aE22997489001305713ac5aE1b3724';
  const modularComplianceImplementation = '0xE0D59015b5FAEf3a617395F72D53152bf169De69';

  const identityFactoryAddress = '0x4AB5a3008550217F246cc71f017ed1AB4569317A';
  const trexImplementationAuthorityAddress = '0xB9D8856e28f3769f025F26Dec753c05a53ae9783';

  console.log('1. Fetching TREXImplementationAuthority...');
  const trexImplementationAuthority = await ethers.getContractAt(
    'TREXImplementationAuthority',
    trexImplementationAuthorityAddress,
    deployer
  );

  const versionStruct = {
    major: 4,
    minor: 0,
    patch: 0,
  };
  const contractsStruct = {
    tokenImplementation: tokenImplementation,
    ctrImplementation: claimTopicsRegistryImplementation,
    irImplementation: identityRegistryImplementation,
    irsImplementation: identityRegistryStorageImplementation,
    tirImplementation: trustedIssuersRegistryImplementation,
    mcImplementation: modularComplianceImplementation,
  };

  // console.log('2. Linking version 4.0.0...');
  // const tx = await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  // await tx.wait();
  // console.log('Linked version 4.0.0 to TREXImplementationAuthority');

  console.log('3. Deploying TREX Factory...');
  const trexFactory = await ethers.deployContract(
    'TREXFactory',
    [trexImplementationAuthorityAddress, identityFactoryAddress],
    deployer
  );
  await trexFactory.deployed();
  console.log(`- TREXFactory deployed at: ${trexFactory.address}`);

  console.log('4. Linking TREXFactory in IdentityFactory...');
  const identityFactory = await new ethers.Contract(
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
