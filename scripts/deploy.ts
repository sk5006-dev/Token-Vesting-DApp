import hre from "hardhat";

async function main() {
  console.log("\n=================== SEPOLIA DEPLOYMENT ===================");
  console.log("Initializing Hardhat network context...");
  
  const networkInstance = await (hre.network as any).getOrCreate();
  const ethers = networkInstance.ethers;

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("Deployer account has zero balance. Please fund your Sepolia account first!");
  }

  console.log("Deploying TokenVesting contract...");
  const TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
  
  const vestingContract = await TokenVestingFactory.deploy();
  await vestingContract.waitForDeployment();

  const contractAddress = await vestingContract.getAddress();
  console.log("---------------------------------------------------------");
  console.log(`SUCCESS: TokenVesting contract deployed!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log("=========================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  });
