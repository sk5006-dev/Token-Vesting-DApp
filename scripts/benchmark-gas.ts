import hre from "hardhat";

async function main() {
  const networkInstance = await (hre.network as any).getOrCreate();
  const ethers = networkInstance.ethers;
  const [owner, beneficiary] = await ethers.getSigners();

  // Deploy contracts
  const MockTokenFactory = await ethers.getContractFactory("MockToken");
  const mockToken = await MockTokenFactory.deploy("Mock Token", "MCK", ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();

  const TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
  const vestingContract = await TokenVestingFactory.deploy();
  await vestingContract.waitForDeployment();

  // Approve Vesting Contract
  await mockToken.approve(await vestingContract.getAddress(), ethers.parseEther("1000000"));

  console.log("\n=================== GAS BENCHMARKS ===================");

  // 1. Benchmark: createVestingSchedule
  const startTime = Math.floor(Date.now() / 1000);
  const amountTotal = ethers.parseEther("12000");
  const ONE_DAY = 24 * 60 * 60;

  const createTx = await vestingContract.createVestingSchedule(
    beneficiary.address,
    await mockToken.getAddress(),
    startTime,
    0, // zero cliff
    360 * ONE_DAY,
    1,
    amountTotal,
    true
  );
  const createReceipt = await createTx.wait();
  console.log(`- createVestingSchedule Gas Used: ${createReceipt.gasUsed.toString()} gas`);

  const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);

  // 2. Advance time to 120 days for claim benchmark
  await ethers.provider.send("evm_increaseTime", [120 * ONE_DAY]);
  await ethers.provider.send("evm_mine", []);

  // 3. Benchmark: claim
  const claimTx = await vestingContract.connect(beneficiary).claim(scheduleId, ethers.parseEther("2000"));
  const claimReceipt = await claimTx.wait();
  console.log(`- claim (partial amount) Gas Used: ${claimReceipt.gasUsed.toString()} gas`);

  // 4. Benchmark: claimAll
  const claimAllTx = await vestingContract.connect(beneficiary).claimAll(scheduleId);
  const claimAllReceipt = await claimAllTx.wait();
  console.log(`- claimAll (remaining amount) Gas Used: ${claimAllReceipt.gasUsed.toString()} gas`);

  // 5. Benchmark: revoke
  // Create a new revocable schedule to test revoke gas cost
  const startTime2 = Math.floor(Date.now() / 1000);
  const createTx2 = await vestingContract.createVestingSchedule(
    beneficiary.address,
    await mockToken.getAddress(),
    startTime2,
    0,
    360 * ONE_DAY,
    1,
    amountTotal,
    true
  );
  await createTx2.wait();
  const scheduleId2 = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 1);

  // Revoke the schedule
  const revokeTx = await vestingContract.revoke(scheduleId2);
  const revokeReceipt = await revokeTx.wait();
  console.log(`- revoke Gas Used: ${revokeReceipt.gasUsed.toString()} gas`);

  // 6. Benchmark: emergencyWithdraw
  // Transfer excess tokens to contract first
  const excessAmount = ethers.parseEther("1000");
  await mockToken.transfer(await vestingContract.getAddress(), excessAmount);

  const withdrawTx = await vestingContract.emergencyWithdraw(await mockToken.getAddress(), excessAmount);
  const withdrawReceipt = await withdrawTx.wait();
  console.log(`- emergencyWithdraw Gas Used: ${withdrawReceipt.gasUsed.toString()} gas`);

  console.log("======================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
