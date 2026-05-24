// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ReentrantMockToken
 * @dev Mock ERC20 token designed to simulate a callback-based reentrancy attack on TokenVesting.
 */
contract ReentrantMockToken is ERC20 {
    address public vestingContract;
    bytes32 public targetScheduleId;
    bool public shouldReenter;
    uint256 public reenterAmount;

    constructor(uint256 initialSupply) ERC20("Reentrant Mock Token", "RMT") {
        _mint(msg.sender, initialSupply);
    }

    function setVestingContract(address _vestingContract) external {
        vestingContract = _vestingContract;
    }

    function setTarget(bytes32 _targetScheduleId, uint256 _amount) external {
        targetScheduleId = _targetScheduleId;
        reenterAmount = _amount;
        shouldReenter = true;
    }

    function disableReentrancy() external {
        shouldReenter = false;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        super.transfer(to, value);
        if (shouldReenter && msg.sender == vestingContract) {
            // Attempt to reenter the claim function
            shouldReenter = false; // Prevent infinite loop in case of failure/success
            (bool success, bytes memory data) = vestingContract.call(
                abi.encodeWithSignature("claim(bytes32,uint256)", targetScheduleId, reenterAmount)
            );
            // If it reverted, we propagate the revert to verify the modifier worked
            if (!success) {
                assembly {
                    revert(add(data, 32), mload(data))
                }
            }
        }
        return true;
    }
}
