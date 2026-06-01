# Token Vesting DApp

## About

The Token Vesting DApp is a blockchain-based decentralized application that allows administrators to lock ERC20 tokens for beneficiaries and release them gradually according to predefined vesting schedules.

Users can securely connect their wallets, track vesting progress, and claim unlocked tokens directly through the web application. The system supports cliff periods, linear vesting, revocable schedules, and secure token distribution through audited smart contracts.

---

## Live Demo

Frontend Application:
https://token-vesting-d-app.vercel.app/

GitHub Repository:
https://github.com/sk5006-dev/Token-Vesting-DApp

---

## Smart Contract Details

Network: Sepolia Testnet

Contract Address:

0xedfaA3F5B7F7d03daE3b80285F05Dde8a83198b8

---

## Features

### Smart Contract Features

* ERC20 Token Vesting
* Cliff Period Support
* Linear Vesting Schedule
* Partial Token Claiming
* Full Token Claiming
* Revocable Vesting Schedules
* Emergency Withdrawal Functionality
* OpenZeppelin Security Standards
* Reentrancy Protection

### Frontend Features

* Modern Next.js Dashboard
* Wallet Integration
* Real-Time Vesting Tracking
* Analytics Dashboard
* Admin Management Panel
* Interactive Charts & Metrics
* Mobile Responsive Design
* Premium Web3 UI Experience

### Wallet Support

* MetaMask
* WalletConnect
* Coinbase Wallet

---

## Technology Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Framer Motion
* Recharts

### Blockchain

* Solidity
* Hardhat
* Ethers.js
* Wagmi
* RainbowKit
* OpenZeppelin

### Network

* Ethereum Sepolia Testnet

---

## Project Architecture

User Wallet
↓
Next.js Frontend
↓
Wagmi / Ethers.js
↓
Token Vesting Smart Contract
↓
Ethereum Sepolia Network

---

## Testing

The project includes comprehensive testing coverage:

* Smart Contract Unit Testing
* Security Testing
* Edge Case Testing
* Access Control Validation
* Reentrancy Protection Testing
* Multi-User Isolation Testing

Result:

27 Passing Tests

---

## Security Features

* Ownable Access Control
* ReentrancyGuard Protection
* Custom Error Handling
* Input Validation
* Emergency Recovery Mechanisms
* Beneficiary Isolation

---

## Gas Optimization

Implemented optimizations include:

* Storage Slot Packing
* SLOAD Caching
* Memory Optimization
* Efficient State Management

Gas benchmark scripts are included in the repository.

---

## Local Setup

Clone the repository:

```bash
git clone https://github.com/sk5006-dev/Token-Vesting-DApp.git
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Run smart contract tests:

```bash
npx hardhat test
```

---

## Environment Variables

Create a .env.local file:

```env
NEXT_PUBLIC_VESTING_CONTRACT_ADDRESS=0xedfaA3F5B7F7d03daE3b80285F05Dde8a83198b8
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
```

---

## Deployment

Frontend:
Hosted on Vercel

Smart Contracts:
Deployed on Ethereum Sepolia Testnet

---

## Future Enhancements

* Email Notifications
* Vesting Calendar View
* Multi-Token Support
* Governance Integration
* Cross-Chain Vesting
* Advanced Analytics

---

## Author

Developed as a complete Web3 Token Vesting Management Platform using Solidity, Hardhat, Next.js, and Ethereum.
