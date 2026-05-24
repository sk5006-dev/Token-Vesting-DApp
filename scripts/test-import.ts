import * as toolbox from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import * as ethersPlugin from "@nomicfoundation/hardhat-ethers";

console.log("TOOLBOX EXPORTS:", Object.keys(toolbox));
console.log("TOOLBOX DEFAULT:", (toolbox as any).default);
console.log("ETHERS EXPORTS:", Object.keys(ethersPlugin));
console.log("ETHERS DEFAULT:", (ethersPlugin as any).default);
