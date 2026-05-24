// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenVesting
 * @dev An optimized smart contract for locking ERC20 tokens and releasing them according to linear vesting schedules.
 * Supports cliffs, slicing periods, revocability by owner, and emergency withdrawals of excess tokens.
 * Optimized storage slot packing and SLOAD operations for maximum gas efficiency.
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        address beneficiary; // 20 bytes
        bool revocable;      // 1 byte  | Packed together in Slot 1
        bool revoked;        // 1 byte  | Packed together in Slot 1
        address token;       // 20 bytes
        uint256 start;
        uint256 cliff;
        uint256 duration;
        uint256 slicePeriodSeconds;
        uint256 amountTotal;
        uint256 released;
    }

    // Mapping from schedule ID to vesting schedule
    mapping(bytes32 => VestingSchedule) private _vestingSchedules;
    
    // Mapping from beneficiary to schedule IDs
    mapping(address => bytes32[]) private _beneficiarySchedules;
    
    // Array of all schedule IDs
    bytes32[] private _vestingSchedulesIds;
    
    // Total amount of tokens locked in active vesting schedules per token address
    mapping(address => uint256) private _totalVestedAmount;

    // Events
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 start,
        uint256 cliff,
        uint256 duration,
        uint256 amountTotal
    );
    
    event TokensClaimed(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 amount
    );
    
    event VestingScheduleRevoked(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 refundAmount
    );
    
    event EmergencyWithdrawn(
        address indexed token,
        address indexed receiver,
        uint256 amount
    );

    /**
     * @dev Constructor initializes the contract setting the deployer as the owner.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a vesting schedule for a beneficiary.
     * @param beneficiary Address of the beneficiary.
     * @param token Address of the ERC20 token.
     * @param start Start timestamp of the vesting schedule.
     * @param cliff Duration of the cliff period in seconds.
     * @param duration Duration of the vesting schedule in seconds.
     * @param slicePeriodSeconds Duration of each vesting slice in seconds.
     * @param amountTotal Total amount of tokens to vest.
     * @param revocable Whether the schedule can be revoked by the owner.
     */
    function createVestingSchedule(
        address beneficiary,
        address token,
        uint256 start,
        uint256 cliff,
        uint256 duration,
        uint256 slicePeriodSeconds,
        uint256 amountTotal,
        bool revocable
    ) external onlyOwner nonReentrant {
        require(beneficiary != address(0), "TokenVesting: beneficiary is zero address");
        require(token != address(0), "TokenVesting: token is zero address");
        require(duration > 0, "TokenVesting: duration must be > 0");
        require(amountTotal > 0, "TokenVesting: amount must be > 0");
        require(slicePeriodSeconds >= 1, "TokenVesting: slicePeriodSeconds must be >= 1");
        require(duration >= cliff, "TokenVesting: duration must be >= cliff");

        // Safe transfer tokens from caller to the contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amountTotal);

        bytes32 scheduleId = computeNextVestingScheduleIdForHolder(beneficiary);
        uint256 cliffTimestamp = start + cliff;

        _vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            revocable: revocable,
            revoked: false,
            token: token,
            start: start,
            cliff: cliffTimestamp,
            duration: duration,
            slicePeriodSeconds: slicePeriodSeconds,
            amountTotal: amountTotal,
            released: 0
        });

        _beneficiarySchedules[beneficiary].push(scheduleId);
        _vestingSchedulesIds.push(scheduleId);
        _totalVestedAmount[token] += amountTotal;

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            token,
            start,
            cliffTimestamp,
            duration,
            amountTotal
        );
    }

    /**
     * @dev Claims a specific amount of vested tokens.
     * @param scheduleId Unique ID of the vesting schedule.
     * @param amount Amount of tokens to claim.
     */
    function claim(bytes32 scheduleId, uint256 amount) external nonReentrant {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        address beneficiary = schedule.beneficiary;
        require(beneficiary != address(0), "TokenVesting: schedule does not exist");
        require(
            msg.sender == beneficiary || msg.sender == owner(),
            "TokenVesting: only beneficiary or owner can claim"
        );
        require(!schedule.revoked, "TokenVesting: schedule is revoked");

        uint256 releasable = _computeReleasableAmount(schedule);
        require(releasable >= amount, "TokenVesting: insufficient vested tokens");

        schedule.released += amount;
        address token = schedule.token;
        _totalVestedAmount[token] -= amount;

        IERC20(token).safeTransfer(beneficiary, amount);

        emit TokensClaimed(scheduleId, beneficiary, token, amount);
    }

    /**
     * @dev Claims all available vested tokens for a schedule.
     * @param scheduleId Unique ID of the vesting schedule.
     */
    function claimAll(bytes32 scheduleId) external nonReentrant {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        address beneficiary = schedule.beneficiary;
        require(beneficiary != address(0), "TokenVesting: schedule does not exist");
        require(
            msg.sender == beneficiary || msg.sender == owner(),
            "TokenVesting: only beneficiary or owner can claim"
        );
        require(!schedule.revoked, "TokenVesting: schedule is revoked");

        uint256 releasable = _computeReleasableAmount(schedule);
        require(releasable > 0, "TokenVesting: no releasable tokens");

        schedule.released += releasable;
        address token = schedule.token;
        _totalVestedAmount[token] -= releasable;

        IERC20(token).safeTransfer(beneficiary, releasable);

        emit TokensClaimed(scheduleId, beneficiary, token, releasable);
    }

    /**
     * @dev Revokes the vesting schedule and refunds unvested tokens to owner.
     * Vested but unreleased tokens are automatically transferred to the beneficiary.
     * @param scheduleId Unique ID of the vesting schedule.
     */
    function revoke(bytes32 scheduleId) external onlyOwner nonReentrant {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        address beneficiary = schedule.beneficiary;
        require(beneficiary != address(0), "TokenVesting: schedule does not exist");
        require(schedule.revocable, "TokenVesting: schedule is not revocable");
        require(!schedule.revoked, "TokenVesting: schedule is already revoked");

        uint256 vested = _computeVestedAmount(schedule);
        uint256 released = schedule.released;
        uint256 releasable = vested - released;
        uint256 amountTotal = schedule.amountTotal;
        uint256 refundAmount = amountTotal - vested;
        address token = schedule.token;

        schedule.revoked = true;
        _totalVestedAmount[token] -= (amountTotal - released);
        
        if (releasable > 0) {
            schedule.released += releasable;
            IERC20(token).safeTransfer(beneficiary, releasable);
            emit TokensClaimed(scheduleId, beneficiary, token, releasable);
        }

        if (refundAmount > 0) {
            IERC20(token).safeTransfer(owner(), refundAmount);
        }

        emit VestingScheduleRevoked(scheduleId, beneficiary, token, refundAmount);
    }

    /**
     * @dev Withdraws excess tokens not locked in vesting schedules (or accidental transfers).
     * @param token Address of the token to withdraw.
     * @param amount Amount to withdraw.
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(0), "TokenVesting: token is zero address");
        
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        uint256 lockedAmount = _totalVestedAmount[token];
        uint256 withdrawableAmount = contractBalance > lockedAmount ? contractBalance - lockedAmount : 0;
        
        require(amount <= withdrawableAmount, "TokenVesting: insufficient withdrawable balance");

        IERC20(token).safeTransfer(owner(), amount);

        emit EmergencyWithdrawn(token, owner(), amount);
    }

    /**
     * @dev Computes the next vesting schedule ID for a holder based on counter.
     */
    function computeNextVestingScheduleIdForHolder(address holder) public view returns (bytes32) {
        return keccak256(abi.encodePacked(holder, _beneficiarySchedules[holder].length));
    }

    /**
     * @dev Public getter for vesting schedules.
     */
    function getVestingSchedule(bytes32 scheduleId) external view returns (VestingSchedule memory) {
        return _vestingSchedules[scheduleId];
    }

    /**
     * @dev Returns number of vesting schedules for a beneficiary.
     */
    function getVestingSchedulesCountByBeneficiary(address beneficiary) external view returns (uint256) {
        return _beneficiarySchedules[beneficiary].length;
    }

    /**
     * @dev Returns schedule ID of a beneficiary by index.
     */
    function getVestingScheduleIdAtIndex(address beneficiary, uint256 index) external view returns (bytes32) {
        require(index < _beneficiarySchedules[beneficiary].length, "TokenVesting: index out of bounds");
        return _beneficiarySchedules[beneficiary][index];
    }

    /**
     * @dev Returns total vesting schedules created.
     */
    function getVestingSchedulesCount() external view returns (uint256) {
        return _vestingSchedulesIds.length;
    }

    /**
     * @dev Returns schedule ID by index.
     */
    function getVestingScheduleIdAtIndex(uint256 index) external view returns (bytes32) {
        require(index < _vestingSchedulesIds.length, "TokenVesting: index out of bounds");
        return _vestingSchedulesIds[index];
    }

    /**
     * @dev Returns the releasable amount of tokens for a vesting schedule.
     */
    function getReleasableAmount(bytes32 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = _vestingSchedules[scheduleId];
        if (schedule.revoked) {
            return 0;
        }
        return _computeReleasableAmount(schedule);
    }

    /**
     * @dev Returns total vested amount of a specific token.
     */
    function getTotalVestedAmount(address token) external view returns (uint256) {
        return _totalVestedAmount[token];
    }

    /**
     * @dev Computes releasable amount internal.
     */
    function _computeReleasableAmount(VestingSchedule storage schedule) private view returns (uint256) {
        return _computeVestedAmount(schedule) - schedule.released;
    }

    /**
     * @dev Computes total vested amount internal.
     */
    function _computeVestedAmount(VestingSchedule storage schedule) private view returns (uint256) {
        if (block.timestamp < schedule.cliff) {
            return 0;
        } else if (block.timestamp >= schedule.start + schedule.duration) {
            return schedule.amountTotal;
        } else {
            uint256 timePastStart = block.timestamp - schedule.start;
            uint256 vestedPeriods = timePastStart / schedule.slicePeriodSeconds;
            uint256 vestedSeconds = vestedPeriods * schedule.slicePeriodSeconds;
            return (schedule.amountTotal * vestedSeconds) / schedule.duration;
        }
    }
}
