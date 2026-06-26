import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('=== Checking Issuer/Deployer Gas Balance ===');
  console.log(`Address: ${deployer.address}`);

  const balance = await deployer.getBalance();
  const balanceEth = parseFloat(ethers.utils.formatEther(balance));

  console.log(`Current Balance: ${balanceEth.toFixed(4)} ETH`);

  const MIN_BALANCE = 0.1; // Min threshold in ETH

  if (balanceEth < MIN_BALANCE) {
    console.warn('\n⚠️  WARNING: Balance is low! You might run out of gas.');
    console.log('To replenish your account on Sepolia Testnet, please visit one of these faucets:');
    console.log('1. Alchemy Sepolia Faucet : https://sepoliafaucet.com/');
    console.log('2. QuickNode Faucet       : https://faucet.quicknode.com/drip');
    console.log('3. Sepolia PoW Faucet     : https://sepolia-faucet.pk910.de/');
    console.log(`\nAddress to fund: ${deployer.address}`);
  } else {
    console.log('\n✅ Balance is sufficient for deploying tokens and executing compliance operations.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
