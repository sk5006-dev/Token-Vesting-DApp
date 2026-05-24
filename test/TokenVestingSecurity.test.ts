import { expect } from "chai";
import hre from "hardhat";

describe("TokenVesting Security & Edge Cases", function () {
  let ethers: any;
  let vestingContract: any;
  let mockToken: any;
  let reentrantToken: any;
  let owner: any;
  let beneficiary: any;
  let intruder: any;

  const ONE_DAY = 24 * 60 * 60;
  const ONE_YEAR = 365 * ONE_DAY;

  // Custom helper to advance time
  async function increaseTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  // Custom helper to fetch current block timestamp
  async function getCurrentTime(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block ? block.timestamp : Math.floor(Date.now() / 1000);
  }

  beforeEach(async function () {
    // Explicitly connect/initialize the Hardhat network to inject/retrieve ethers plugin
    const networkInstance = await (hre.network as any).getOrCreate();
    ethers = networkInstance.ethers;
    [owner, beneficiary, intruder] = await ethers.getSigners();

    // Deploy standard Mock Token
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    mockToken = await MockTokenFactory.deploy("Mock Token", "MCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy Reentrant Mock Token
    const ReentrantTokenFactory = await ethers.getContractFactory("ReentrantMockToken");
    reentrantToken = await ReentrantTokenFactory.deploy(ethers.parseEther("1000000"));
    await reentrantToken.waitForDeployment();

    // Deploy TokenVesting contract
    const TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    vestingContract = await TokenVestingFactory.deploy();
    await vestingContract.waitForDeployment();

    // Approve Vesting Contract to spend owner tokens (both standard and reentrant)
    await mockToken.approve(await vestingContract.getAddress(), ethers.parseEther("1000000"));
    await reentrantToken.approve(await vestingContract.getAddress(), ethers.parseEther("1000000"));

    // Set vesting contract address in the reentrant token
    await reentrantToken.setVestingContract(await vestingContract.getAddress());
  });

  describe("Reentrancy Protection", function () {
    it("Should revert reentrant claim attempts inside token transfer", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      // Create a vesting schedule using the reentrant token
      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await reentrantToken.getAddress(),
        startTime,
        0, // zero cliff
        ONE_YEAR,
        1,
        amountTotal,
        true
      );

      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);

      // Advance time by 180 days (halfway, 5000 tokens releasable)
      await increaseTime(180 * ONE_DAY);

      // Set target schedule and amount to trigger reentry during transfer callback
      // This will attempt to call claim again on the same schedule
      await reentrantToken.setTarget(scheduleId, ethers.parseEther("1000"));

      // Attempting to claim should trigger the callback in the token, which tries to reenter.
      // The nonReentrant modifier on `claim` should prevent this and cause a revert.
      // The revert should propagate the OpenZeppelin custom error ReentrancyGuardReentrantCall.
      await expect(
        vestingContract.connect(beneficiary).claim(scheduleId, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(vestingContract, "ReentrancyGuardReentrantCall");
    });
  });

  describe("Zero-Address Validations", function () {
    it("Should revert if beneficiary is the zero address", async function () {
      const startTime = await getCurrentTime();
      await expect(
        vestingContract.createVestingSchedule(
          ethers.ZeroAddress,
          await mockToken.getAddress(),
          startTime,
          0,
          ONE_YEAR,
          1,
          ethers.parseEther("1000"),
          true
        )
      ).to.be.revertedWith("TokenVesting: beneficiary is zero address");
    });

    it("Should revert if token is the zero address", async function () {
      const startTime = await getCurrentTime();
      await expect(
        vestingContract.createVestingSchedule(
          beneficiary.address,
          ethers.ZeroAddress,
          startTime,
          0,
          ONE_YEAR,
          1,
          ethers.parseEther("1000"),
          true
        )
      ).to.be.revertedWith("TokenVesting: token is zero address");
    });

    it("Should revert if emergency withdrawal token is the zero address", async function () {
      await expect(
        vestingContract.emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("TokenVesting: token is zero address");
    });
  });

  describe("Vesting Schedule Manipulation Checks", function () {
    it("Should revert if claiming from a non-existent schedule", async function () {
      const invalidScheduleId = ethers.keccak256(ethers.toUtf8Bytes("invalid"));
      await expect(
        vestingContract.claim(invalidScheduleId, ethers.parseEther("100"))
      ).to.be.revertedWith("TokenVesting: schedule does not exist");
    });

    it("Should revert if revoking a non-existent schedule", async function () {
      const invalidScheduleId = ethers.keccak256(ethers.toUtf8Bytes("invalid"));
      await expect(
        vestingContract.revoke(invalidScheduleId)
      ).to.be.revertedWith("TokenVesting: schedule does not exist");
    });

    it("Should revert if trying to revoke a non-revocable schedule", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        0,
        ONE_YEAR,
        1,
        amountTotal,
        false // NOT revocable
      );

      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);

      await expect(
        vestingContract.revoke(scheduleId)
      ).to.be.revertedWith("TokenVesting: schedule is not revocable");
    });

    it("Should revert if trying to revoke an already revoked schedule", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        0,
        ONE_YEAR,
        1,
        amountTotal,
        true // revocable
      );

      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);

      // Revoke once (succeeds)
      await vestingContract.revoke(scheduleId);

      // Attempt to revoke again (should fail)
      await expect(
        vestingContract.revoke(scheduleId)
      ).to.be.revertedWith("TokenVesting: schedule is already revoked");
    });
  });

  describe("Double-Claim Prevention", function () {
    it("Should prevent double-claims of releasable tokens", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("12000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        0,
        360 * ONE_DAY,
        30 * ONE_DAY, // slicePeriod is 30 days to avoid small block time shifts
        amountTotal,
        true
      );

      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);

      // 1. Advance by 120 days (4000 tokens releasable)
      await increaseTime(120 * ONE_DAY);

      // 2. Claim all releasable tokens (4000 tokens)
      await vestingContract.connect(beneficiary).claimAll(scheduleId);
      expect(await mockToken.balanceOf(beneficiary.address)).to.be.closeTo(ethers.parseEther("4000"), ethers.parseEther("10"));

      // 3. Immediately attempt to claimAll again. It should revert since releasable is now 0.
      await expect(
        vestingContract.connect(beneficiary).claimAll(scheduleId)
      ).to.be.revertedWith("TokenVesting: no releasable tokens");

      // 4. Try to claim partial 1 token. Should revert due to insufficient balance.
      await expect(
        vestingContract.connect(beneficiary).claim(scheduleId, ethers.parseEther("1"))
      ).to.be.revertedWith("TokenVesting: insufficient vested tokens");
    });
  });

  describe("Access-Control & Emergency Abuse Prevention", function () {
    it("Should prevent unauthorized users from performing emergency withdrawals", async function () {
      const excessAmount = ethers.parseEther("5000");
      await mockToken.transfer(await vestingContract.getAddress(), excessAmount);

      await expect(
        vestingContract.connect(intruder).emergencyWithdraw(await mockToken.getAddress(), excessAmount)
      ).to.be.revertedWithCustomError(vestingContract, "OwnableUnauthorizedAccount").withArgs(intruder.address);
    });

    it("Should revert emergency withdraw if amount exceeds withdrawable balance", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        0,
        ONE_YEAR,
        1,
        amountTotal,
        true
      );

      // Total balance in contract is exactly amountTotal (10000).
      // Excess is 0. Attempting to withdraw any amount should revert.
      await expect(
        vestingContract.emergencyWithdraw(await mockToken.getAddress(), ethers.parseEther("1"))
      ).to.be.revertedWith("TokenVesting: insufficient withdrawable balance");
    });
  });

  describe("Multi-User Isolation & State Consistency", function () {
    it("Should isolate schedules and protect state consistency", async function () {
      const startTime = await getCurrentTime();
      const amount1 = ethers.parseEther("5000");
      const amount2 = ethers.parseEther("8000");

      // Create schedule for beneficiary
      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        0,
        360 * ONE_DAY, // 360 days duration for exact division with 180 days
        1,
        amount1,
        true
      );

      // Create schedule for intruder
      await vestingContract.createVestingSchedule(
        intruder.address,
        await mockToken.getAddress(),
        startTime,
        0,
        360 * ONE_DAY, // 360 days duration for exact division with 180 days
        1,
        amount2,
        true
      );

      const idBeneficiary = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);
      const idIntruder = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](intruder.address, 0);

      // 1. Intruder attempts to claim beneficiary's tokens. Should revert.
      await expect(
        vestingContract.connect(intruder).claim(idBeneficiary, ethers.parseEther("1000"))
      ).to.be.revertedWith("TokenVesting: only beneficiary or owner can claim");

      // Verify that beneficiary state is intact
      let schedule = await vestingContract.getVestingSchedule(idBeneficiary);
      expect(schedule.released).to.equal(0n);

      // 2. Owner attempts to claim more than releasable for beneficiary.
      // Should revert and state should remain consistent.
      await increaseTime(180 * ONE_DAY); // 50% vested (2500 for beneficiary, 4000 for intruder)

      await expect(
        vestingContract.connect(owner).claim(idBeneficiary, ethers.parseEther("3000"))
      ).to.be.revertedWith("TokenVesting: insufficient vested tokens");

      // Verify state consistency after reverted claim
      schedule = await vestingContract.getVestingSchedule(idBeneficiary);
      expect(schedule.released).to.equal(0n);
      expect(await mockToken.balanceOf(beneficiary.address)).to.equal(0n);

      // 3. Intruder claims their own. Should not impact beneficiary's schedule.
      await vestingContract.connect(intruder).claim(idIntruder, ethers.parseEther("2000"));

      const scheduleIntruder = await vestingContract.getVestingSchedule(idIntruder);
      expect(scheduleIntruder.released).to.equal(ethers.parseEther("2000"));

      schedule = await vestingContract.getVestingSchedule(idBeneficiary);
      expect(schedule.released).to.equal(0n); // beneficiary remains 0
      expect(await vestingContract.getReleasableAmount(idBeneficiary)).to.be.closeTo(ethers.parseEther("2500"), ethers.parseEther("10"));
    });
  });
});
