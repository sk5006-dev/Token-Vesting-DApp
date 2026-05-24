import hre from "hardhat";
console.log("BEFORE getOrCreate:", (hre as any).ethers);
const networkInstance = await (hre.network as any).getOrCreate();
console.log("AFTER getOrCreate:", (hre as any).ethers);
console.log("NETWORK INSTANCE ETHERS:", (networkInstance as any).ethers);
