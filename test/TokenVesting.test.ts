import { expect } from "chai";
import hre from "hardhat";

describe("TokenVesting", function () {
  let ethers: any;
  let vestingContract: any;
  let mockToken: any;
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

    // Deploy Mock Token
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    mockToken = await MockTokenFactory.deploy("Mock Token", "MCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy TokenVesting contract
    const TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
    vestingContract = await TokenVestingFactory.deploy();
    await vestingContract.waitForDeployment();

    // Approve Vesting Contract to spend owner tokens
    await mockToken.approve(await vestingContract.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await vestingContract.owner()).to.equal(owner.address);
    });
  });

  describe("Vesting Schedule Creation", function () {
    it("Should create a vesting schedule successfully", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        30 * ONE_DAY, // cliff
        ONE_YEAR, // duration
        1, // slicePeriod
        amountTotal,
        true // revocable
      );

      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);
      const schedule = await vestingContract.getVestingSchedule(scheduleId);

      expect(schedule.beneficiary).to.equal(beneficiary.address);
      expect(schedule.amountTotal).to.equal(amountTotal);
      expect(schedule.released).to.equal(0n);
      expect(schedule.revocable).to.equal(true);
      expect(schedule.revoked).to.equal(false);
      
      expect(await vestingContract.getTotalVestedAmount(await mockToken.getAddress())).to.equal(amountTotal);
    });

    it("Should revert if non-owner tries to create a vesting schedule", async function () {
      const startTime = await getCurrentTime();
      await expect(
        vestingContract.connect(intruder).createVestingSchedule(
          beneficiary.address,
          await mockToken.getAddress(),
          startTime,
          0,
          ONE_YEAR,
          1,
          ethers.parseEther("1000"),
          true
        )
      ).to.be.revertedWithCustomError(vestingContract, "OwnableUnauthorizedAccount").withArgs(intruder.address);
    });

    it("Should revert if duration is less than cliff", async function () {
      const startTime = await getCurrentTime();
      await expect(
        vestingContract.createVestingSchedule(
          beneficiary.address,
          await mockToken.getAddress(),
          startTime,
          60 * ONE_DAY, // cliff
          30 * ONE_DAY, // duration (less than cliff)
          1,
          ethers.parseEther("1000"),
          true
        )
      ).to.be.revertedWith("TokenVesting: duration must be >= cliff");
    });
  });

  describe("Vesting Cliff Validation", function () {
    it("Should return 0 claimable tokens before cliff period", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        30 * ONE_DAY, // 30 day cliff
        ONE_YEAR,
        1,
        amountTotal,
        true
      );

      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);
      
      // Advance time by 15 days (halfway through cliff)
      await increaseTime(15 * ONE_DAY);

      expect(await vestingContract.getReleasableAmount(scheduleId)).to.equal(0n);
      
      // Attempting to claim should revert
      await expect(
        vestingContract.connect(beneficiary).claim(scheduleId, ethers.parseEther("100"))
      ).to.be.revertedWith("TokenVesting: insufficient vested tokens");
    });
  });

  describe("Token Claiming Logic", function () {
    let scheduleId: string;
    let amountTotal: any;

    beforeEach(async function () {
      amountTotal = ethers.parseEther("12000"); // 12,000 tokens for easy division
      const startTime = await getCurrentTime();
      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        30 * ONE_DAY, // 30 days cliff
        360 * ONE_DAY, // 360 days duration (easy division)
        1,
        amountTotal,
        true
      );
      scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);
    });

    it("Should claim partial vested tokens after cliff", async function () {
      // Advance time to 120 days past start
      await increaseTime(120 * ONE_DAY);

      // Vested amount should be 120/360 = 1/3 of total = 4,000 tokens
      const releasable = await vestingContract.getReleasableAmount(scheduleId);
      expect(releasable).to.be.closeTo(ethers.parseEther("4000"), ethers.parseEther("10"));

      const claimAmount = ethers.parseEther("2000");
      await vestingContract.connect(beneficiary).claim(scheduleId, claimAmount);

      const schedule = await vestingContract.getVestingSchedule(scheduleId);
      expect(schedule.released).to.equal(claimAmount);
      expect(await mockToken.balanceOf(beneficiary.address)).to.equal(claimAmount);
    });

    it("Should allow claiming all tokens after full vesting period", async function () {
      // Advance time beyond full duration (e.g. 400 days)
      await increaseTime(400 * ONE_DAY);

      expect(await vestingContract.getReleasableAmount(scheduleId)).to.equal(amountTotal);

      await vestingContract.connect(beneficiary).claimAll(scheduleId);

      const schedule = await vestingContract.getVestingSchedule(scheduleId);
      expect(schedule.released).to.equal(amountTotal);
      expect(await mockToken.balanceOf(beneficiary.address)).to.equal(amountTotal);
    });

    it("Should revert if claiming more than releasable", async function () {
      await increaseTime(120 * ONE_DAY); // 4000 claimable
      await expect(
        vestingContract.connect(beneficiary).claim(scheduleId, ethers.parseEther("5000"))
      ).to.be.revertedWith("TokenVesting: insufficient vested tokens");
    });
  });

  describe("Schedule Revocation", function () {
    let scheduleId: string;
    let amountTotal: any;

    beforeEach(async function () {
      amountTotal = ethers.parseEther("12000");
      const startTime = await getCurrentTime();
      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        30 * ONE_DAY,
        360 * ONE_DAY,
        1,
        amountTotal,
        true // revocable
      );
      scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);
    });

    it("Should revoke schedule and refund owner unvested tokens", async function () {
      // Advance 120 days (4,000 tokens vested)
      await increaseTime(120 * ONE_DAY);

      const ownerBeforeBalance = await mockToken.balanceOf(owner.address);

      await vestingContract.revoke(scheduleId);

      const schedule = await vestingContract.getVestingSchedule(scheduleId);
      expect(schedule.revoked).to.equal(true);

      // Beneficiary should automatically receive the vested portion (4,000 tokens)
      expect(await mockToken.balanceOf(beneficiary.address)).to.be.closeTo(ethers.parseEther("4000"), ethers.parseEther("10"));

      // Owner should be refunded the unvested portion (8,000 tokens)
      const ownerAfterBalance = await mockToken.balanceOf(owner.address);
      expect(ownerAfterBalance - ownerBeforeBalance).to.be.closeTo(ethers.parseEther("8000"), ethers.parseEther("10"));
    });

    it("Should revert if non-owner tries to revoke", async function () {
      await expect(
        vestingContract.connect(intruder).revoke(scheduleId)
      ).to.be.revertedWithCustomError(vestingContract, "OwnableUnauthorizedAccount").withArgs(intruder.address);
    });
  });

  describe("Emergency Withdrawal", function () {
    it("Should allow owner to withdraw excess unallocated tokens", async function () {
      // Transfer excess tokens to contract
      const excessAmount = ethers.parseEther("5000");
      await mockToken.transfer(await vestingContract.getAddress(), excessAmount);

      const ownerBeforeBalance = await mockToken.balanceOf(owner.address);

      // Withdraw excess
      await vestingContract.emergencyWithdraw(await mockToken.getAddress(), excessAmount);

      const ownerAfterBalance = await mockToken.balanceOf(owner.address);
      expect(ownerAfterBalance - ownerBeforeBalance).to.equal(excessAmount);
    });

    it("Should prevent owner from withdrawing locked tokens", async function () {
      const startTime = await getCurrentTime();
      const amountTotal = ethers.parseEther("10000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        30 * ONE_DAY,
        ONE_YEAR,
        1,
        amountTotal,
        true
      );

      // Attempt to withdraw locked tokens should revert
      await expect(
        vestingContract.emergencyWithdraw(await mockToken.getAddress(), amountTotal)
      ).to.be.revertedWith("TokenVesting: insufficient withdrawable balance");
    });
  });

  describe("Advanced and Edge Cases", function () {
    it("Should manage independent schedules for multiple beneficiaries", async function () {
      const startTime = await getCurrentTime();
      const amount1 = ethers.parseEther("5000");
      const amount2 = ethers.parseEther("7000");

      // Schedule for beneficiary (already has index 0 from beforeEach, so this will be index 1)
      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        startTime,
        0, // no cliff
        ONE_YEAR,
        1,
        amount1,
        true
      );
      
      // Schedule for intruder
      await vestingContract.createVestingSchedule(
        intruder.address,
        await mockToken.getAddress(),
        startTime,
        0, // no cliff
        ONE_YEAR,
        1,
        amount2,
        true
      );

      // Verify schedule counts
      expect(await vestingContract.getVestingSchedulesCountByBeneficiary(beneficiary.address)).to.equal(1n);
      expect(await vestingContract.getVestingSchedulesCountByBeneficiary(intruder.address)).to.equal(1n);

      const id1 = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);
      const id2 = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](intruder.address, 0);

      const schedule1 = await vestingContract.getVestingSchedule(id1);
      const schedule2 = await vestingContract.getVestingSchedule(id2);

      expect(schedule1.beneficiary).to.equal(beneficiary.address);
      expect(schedule1.amountTotal).to.equal(amount1);
      expect(schedule2.beneficiary).to.equal(intruder.address);
      expect(schedule2.amountTotal).to.equal(amount2);
    });

    it("Should handle timestamp edge cases: start time in future and before cliff", async function () {
      const currentTime = await getCurrentTime();
      const futureStart = currentTime + 10 * ONE_DAY;
      const amount = ethers.parseEther("1000");

      await vestingContract.createVestingSchedule(
        beneficiary.address,
        await mockToken.getAddress(),
        futureStart,
        5 * ONE_DAY, // cliff is 5 days
        10 * ONE_DAY, // duration
        1,
        amount,
        true
      );

      // Beneficiary is at index 0 on a fresh deployment
      const scheduleId = await vestingContract["getVestingScheduleIdAtIndex(address,uint256)"](beneficiary.address, 0);

      // 1. Time is before futureStart (e.g. current time)
      expect(await vestingContract.getReleasableAmount(scheduleId)).to.equal(0n);

      // 2. Time is exactly at start (before cliff)
      await increaseTime(10 * ONE_DAY);
      expect(await vestingContract.getReleasableAmount(scheduleId)).to.equal(0n);

      // 3. Time is inside cliff (e.g., 3 days after start)
      await increaseTime(3 * ONE_DAY);
      expect(await vestingContract.getReleasableAmount(scheduleId)).to.equal(0n);

      // 4. Time is past cliff (e.g., 6 days after start)
      await increaseTime(3 * ONE_DAY);
      const releasable = await vestingContract.getReleasableAmount(scheduleId);
      expect(releasable).to.be.closeTo(ethers.parseEther("600"), ethers.parseEther("10"));
    });

    it("Should revert if trying to create a schedule with insufficient owner balance", async function () {
      const startTime = await getCurrentTime();
      const ownerBalance = await mockToken.balanceOf(owner.address);
      
      // Transfer almost all tokens to beneficiary, keeping only 100 tokens
      await mockToken.transfer(beneficiary.address, ownerBalance - ethers.parseEther("100"));

      // Try to create schedule for 200 tokens (more than remaining 100 tokens)
      await expect(
        vestingContract.createVestingSchedule(
          beneficiary.address,
          await mockToken.getAddress(),
          startTime,
          0,
          ONE_YEAR,
          1,
          ethers.parseEther("200"),
          true
        )
      ).to.be.revertedWithCustomError(mockToken, "ERC20InsufficientBalance");
    });
  });
});
