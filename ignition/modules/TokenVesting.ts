import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenVestingModule = buildModule("TokenVestingModule", (m) => {
  const tokenVesting = m.contract("TokenVesting");

  return { tokenVesting };
});

export default TokenVestingModule;
