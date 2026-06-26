import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';

async function main() {
  const [deployer, tokenIssuer, tokenAgent, claimIssuer] = await ethers.getSigners();
  const claimIssuerSigningKey = ethers.Wallet.createRandom();

  console.log('=== Starting ERC-3643 Gas & TPS Benchmark ===');
  console.log('1. Deploying implementations & authority...');

  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  const tokenImplementation = await ethers.deployContract('Token', deployer);

  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer
  ).deploy(deployer.address, true);

  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer
  ).deploy(identityImplementation.address);

  // Deploy TREX Implementation Authority
  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
    deployer
  );

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

  await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);

  console.log('2. Deploying Proxies...');
  const claimTopicsRegistry = await ethers
    .deployContract('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('ClaimTopicsRegistry', proxy.address));

  const trustedIssuersRegistry = await ethers
    .deployContract('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('TrustedIssuersRegistry', proxy.address));

  const identityRegistryStorage = await ethers
    .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));

  const identityRegistry = await ethers
    .deployContract(
      'IdentityRegistryProxy',
      [
        trexImplementationAuthority.address,
        trustedIssuersRegistry.address,
        claimTopicsRegistry.address,
        identityRegistryStorage.address
      ],
      deployer
    )
    .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));

  // Initialize Storage registry link
  await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);

  const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);

  const tokenOID = await new ethers.ContractFactory(
    OnchainID.contracts.IdentityProxy.abi,
    OnchainID.contracts.IdentityProxy.bytecode,
    deployer
  ).deploy(identityImplementationAuthority.address, tokenIssuer.address);

  const token = await ethers.deployContract('TokenProxy', [
    trexImplementationAuthority.address,
    identityRegistry.address,
    defaultCompliance.address,
    'Benchmark Token',
    'BMT',
    0,
    tokenOID.address
  ]).then((proxy) => ethers.getContractAt('Token', proxy.address));

  // Connect identities to token agent
  await token.connect(deployer).addAgent(tokenAgent.address);
  await identityRegistry.connect(deployer).addAgent(tokenAgent.address);

  // Set claim topic
  const claimTopic = 1;
  await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopic);

  const claimIssuerContract = await ethers.deployContract('ClaimIssuer', [claimIssuer.address], claimIssuer);
  await claimIssuerContract
    .connect(claimIssuer)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [claimIssuerSigningKey.address])), 3, 1);

  await trustedIssuersRegistry.connect(deployer).addTrustedIssuer(claimIssuerContract.address, [claimTopic]);
  await token.connect(tokenAgent).unpause();

  console.log('3. Generating 20 investor wallets & ONCHAINID identities...');
  const investors: { wallet: any; identity: any }[] = [];
  const count = 20;

  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    // Fund investor wallet slightly to make transfers
    await deployer.sendTransaction({
      to: wallet.address,
      value: ethers.utils.parseEther('0.1')
    });

    const identity = await new ethers.ContractFactory(
      OnchainID.contracts.IdentityProxy.abi,
      OnchainID.contracts.IdentityProxy.bytecode,
      deployer
    ).deploy(identityImplementationAuthority.address, wallet.address);

    investors.push({ wallet, identity });
  }

  console.log('4. Registering identities and writing KYC claims...');
  const startTimeClaims = Date.now();
  for (let i = 0; i < count; i++) {
    const { wallet, identity } = investors[i];
    await identityRegistry.connect(tokenAgent).registerIdentity(wallet.address, identity.address, 1);

    const claimForInvestor = {
      data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Verified KYC')),
      issuer: claimIssuerContract.address,
      topic: claimTopic,
      scheme: 1,
      identity: identity.address,
      signature: ''
    };

    claimForInvestor.signature = await claimIssuerSigningKey.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'bytes'], [claimForInvestor.identity, claimForInvestor.topic, claimForInvestor.data])
        )
      )
    );

    // Call addClaim as wallet management key
    const identityInstance = await ethers.getContractAt(
      OnchainID.contracts.Identity.abi,
      identity.address,
      wallet
    );
    await identityInstance.connect(wallet).addClaim(
      claimForInvestor.topic,
      claimForInvestor.scheme,
      claimForInvestor.issuer,
      claimForInvestor.signature,
      claimForInvestor.data,
      ''
    );
  }
  const endTimeClaims = Date.now();
  console.log(`Claims registration time: ${(endTimeClaims - startTimeClaims) / 1000}s`);

  console.log('5. Benchmarking Mint Operations...');
  let totalGasMint = 0;
  const mintsCount = count;
  const mintStartTime = Date.now();

  for (let i = 0; i < mintsCount; i++) {
    const tx = await token.connect(tokenAgent).mint(investors[i].wallet.address, 1000);
    const receipt = await tx.wait();
    totalGasMint += receipt.gasUsed.toNumber();
  }

  const mintEndTime = Date.now();
  const totalMintDuration = (mintEndTime - mintStartTime) / 1000;
  const mintTPS = mintsCount / totalMintDuration;
  const avgGasMint = totalGasMint / mintsCount;

  console.log(`\n--- Mint Benchmark Results ---`);
  console.log(`Total Mints: ${mintsCount}`);
  console.log(`Duration: ${totalMintDuration.toFixed(2)}s`);
  console.log(`Throughput: ${mintTPS.toFixed(2)} TPS`);
  console.log(`Average Gas: ${avgGasMint.toLocaleString()} gas/tx`);

  console.log('\n6. Benchmarking Transfer Operations (compliant)...');
  let totalGasTransfer = 0;
  const transfersCount = count - 1;
  const transferStartTime = Date.now();

  for (let i = 0; i < transfersCount; i++) {
    const sender = investors[i];
    const receiver = investors[i + 1];
    
    // Perform transfer
    const tx = await token.connect(tokenAgent).forcedTransfer(sender.wallet.address, receiver.wallet.address, 100);
    const receipt = await tx.wait();
    totalGasTransfer += receipt.gasUsed.toNumber();
  }

  const transferEndTime = Date.now();
  const totalTransferDuration = (transferEndTime - transferStartTime) / 1000;
  const transferTPS = transfersCount / totalTransferDuration;
  const avgGasTransfer = totalGasTransfer / transfersCount;

  console.log(`\n--- Transfer Benchmark Results ---`);
  console.log(`Total Transfers: ${transfersCount}`);
  console.log(`Duration: ${totalTransferDuration.toFixed(2)}s`);
  console.log(`Throughput: ${transferTPS.toFixed(2)} TPS`);
  console.log(`Average Gas: ${avgGasTransfer.toLocaleString()} gas/tx`);

  console.log('\n=== Benchmark Complete ===');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
