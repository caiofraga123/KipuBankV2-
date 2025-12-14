# KipuBankV2

> **Advanced Multi-Asset Vault System with USD-Based Accounting**

A production-ready smart contract vault system that supports multiple assets (ETH + ERC20 tokens), implements Chainlink price feeds for real-time USD valuation, and features role-based access control.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5.0-purple)](https://openzeppelin.com/)
[![Chainlink](https://img.shields.io/badge/Chainlink-Integrated-375BD2)](https://chain.link/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Improvements from V1](#key-improvements-from-v1)
- [Architecture](#architecture)
- [Features](#features)
- [Installation](#installation)
- [Deployment](#deployment)
- [Interaction Guide](#interaction-guide)
- [Design Decisions](#design-decisions)
- [Security](#security)
- [Testing](#testing)
- [Contract Address](#contract-address)

---

## 🎯 Overview

KipuBankV2 is an evolution of the original KipuBank contract, transforming it from a simple ETH vault into a sophisticated multi-asset management system with real-world financial primitives.

### What KipuBankV2 Does

- **Multi-Asset Support**: Deposit and withdraw both native ETH and any ERC20 token
- **USD-Based Limits**: All caps and limits denominated in USD for consistent value management
- **Real-Time Pricing**: Integrates Chainlink oracles for accurate asset valuation
- **Normalized Accounting**: All balances stored in 6 decimals (USDC standard) for uniform accounting
- **Role-Based Access**: Administrative functions protected with OpenZeppelin's AccessControl
- **Transaction History**: Complete audit trail of all user deposits and withdrawals
- **Emergency Controls**: Pause functionality for crisis management

---

## 🚀 Key Improvements from V1

| Feature | V1 (Original) | V2 (Enhanced) |
|---------|--------------|---------------|
| **Asset Support** | Native ETH only | ETH + Multiple ERC20 tokens |
| **Limit System** | Fixed ETH amounts | USD-based with real-time conversion |
| **Price Discovery** | None | Chainlink oracle integration |
| **Accounting** | Simple balances | Normalized 6-decimal system |
| **Access Control** | None | Multi-role system (Admin, Emergency) |
| **Token Standards** | Manual transfers | OpenZeppelin SafeERC20 |
| **User Experience** | Basic | Transaction history, multi-balance views |
| **Security** | Basic CEI | Enhanced + Pausable + Input validation |

---

## 🏗️ Architecture

### Smart Contract Structure

```
KipuBankV2
├── Type Declarations
│   ├── Asset struct
│   └── Transaction struct
├── State Variables
│   ├── Role constants
│   ├── Limits (immutable/constant)
│   ├── Accounting variables
│   └── Nested mappings
├── Access Control
│   ├── ADMIN_ROLE
│   ├── EMERGENCY_ROLE
│   └── DEFAULT_ADMIN_ROLE
├── Core Functions
│   ├── depositETH()
│   ├── depositERC20()
│   ├── withdrawETH()
│   └── withdrawERC20()
├── Admin Functions
│   ├── addAsset()
│   ├── setAssetStatus()
│   ├── emergencyPause()
│   └── unpause()
└── Helper Functions
    ├── Price conversion
    ├── Decimal normalization
    └── View functions
```

### Key Components

#### 1. **Type Declarations** ✅ (Requirement)

```solidity
struct Asset {
    address tokenAddress;
    uint8 decimals;
    address priceFeed;
    bool isActive;
    uint256 totalDeposited;
}

struct Transaction {
    address token;
    uint256 amount;
    uint256 timestamp;
    bool isDeposit;
}
```

#### 2. **Access Control** ✅ (Requirement)

Three-tier role system using OpenZeppelin's AccessControl:

- **DEFAULT_ADMIN_ROLE**: Can grant/revoke all other roles
- **ADMIN_ROLE**: Can add assets, change statuses, unpause contract
- **EMERGENCY_ROLE**: Can trigger emergency pause

#### 3. **Chainlink Oracle Integration** ✅ (Requirement)

```solidity
AggregatorV3Interface priceFeed = AggregatorV3Interface(asset.priceFeed);
(, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = 
    priceFeed.latestRoundData();
```

Features:
- Stale price detection (1 hour threshold)
- Invalid price rejection
- Round data validation

#### 4. **Constants** ✅ (Requirement)

```solidity
uint256 public constant BANK_CAP_USD = 1_000_000 * 1e6; // $1M
uint8 public constant ACCOUNTING_DECIMALS = 6;
address public constant NATIVE_ETH = address(0);
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
```

#### 5. **Nested Mappings** ✅ (Requirement)

```solidity
// User => Token => Balance (in 6 decimals)
mapping(address => mapping(address => uint256)) private userVaults;

// User => Transaction history
mapping(address => Transaction[]) private userTransactions;

// Token => Asset metadata
mapping(address => Asset) public supportedAssets;
```

#### 6. **Decimal Conversion Function** ✅ (Requirement)

```solidity
function _normalizeDecimals(
    uint256 amount,
    uint8 fromDecimals,
    uint8 toDecimals
) private pure returns (uint256)
```

Converts between different decimal systems (e.g., 18 decimals ETH → 6 decimals USDC standard)

---

## ✨ Features

### For Users

- 🪙 **Multi-Token Deposits**: Deposit ETH or supported ERC20 tokens
- 💸 **Flexible Withdrawals**: Withdraw assets up to the USD limit
- 📊 **Portfolio View**: See all your balances across different assets
- 📜 **Transaction History**: Complete audit trail of your activity
- 💱 **Real-Time Valuation**: Know the USD value of your holdings

### For Administrators

- ➕ **Asset Management**: Add new tokens with Chainlink price feeds
- 🔄 **Status Control**: Enable/disable specific assets
- ⏸️ **Emergency Pause**: Freeze all operations in case of emergency
- 👥 **Role Management**: Grant/revoke admin and emergency roles

### Security Features

- ✅ CEI (Checks-Effects-Interactions) pattern
- ✅ ReentrancyGuard built into state changes
- ✅ OpenZeppelin SafeERC20 for token transfers
- ✅ Custom errors for gas efficiency
- ✅ Input validation on all functions
- ✅ Price feed staleness detection
- ✅ Emergency pause mechanism

---

## 📦 Installation

### Prerequisites

- Node.js v18+ and npm
- Hardhat
- MetaMask or similar Web3 wallet

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/KipuBankV2.git
cd KipuBankV2

# Install dependencies
npm install

# Install OpenZeppelin contracts
npm install @openzeppelin/contracts

# Install Chainlink contracts
npm install @chainlink/contracts

# Create environment file
cp .env.example .env

# Edit .env with your keys
nano .env
```

### Required Dependencies

```json
{
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.0",
    "@chainlink/contracts": "^0.8.0"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^4.0.0",
    "hardhat": "^2.19.0",
    "dotenv": "^16.3.1"
  }
}
```

---

## 🚀 Deployment

### 1. Configure Environment

Create a `.env` file:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Update Hardhat Config

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
```

### 3. Create Deployment Script

Create `scripts/deploy-v2.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying KipuBankV2...\n");

  // Withdrawal limit: $1,000 USD (in 6 decimals)
  const withdrawalLimitUSD = 1000 * 1e6;

  const KipuBankV2 = await hre.ethers.getContractFactory("KipuBankV2");
  const kipuBankV2 = await KipuBankV2.deploy(withdrawalLimitUSD);

  await kipuBankV2.waitForDeployment();
  const address = await kipuBankV2.getAddress();

  console.log("✅ KipuBankV2 deployed to:", address);

  // Add ETH as supported asset
  console.log("\n📝 Adding native ETH support...");
  
  // Sepolia ETH/USD price feed: 0x694AA1769357215DE4FAC081bf1f309aDC325306
  const ethPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  
  await kipuBankV2.addAsset(
    "0x0000000000000000000000000000000000000000", // Native ETH
    18, // decimals
    ethPriceFeed
  );

  console.log("✅ ETH added as supported asset");
  console.log("\n📋 Next steps:");
  console.log("1. Verify contract on Etherscan");
  console.log("2. Add more ERC20 tokens via addAsset()");
  console.log("3. Test deposits and withdrawals");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 4. Deploy

```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy-v2.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> "1000000000"
```

### 5. Add Additional Assets

After deployment, add ERC20 tokens:

```javascript
// Example: Add USDC on Sepolia
// USDC address: 0x... (Sepolia USDC)
// USDC/USD feed: 0x... (Chainlink USDC/USD)

await kipuBankV2.addAsset(
  "0xUSDC_ADDRESS",
  6, // USDC has 6 decimals
  "0xCHAINLINK_USDC_USD_FEED"
);
```

---

## 💻 Interaction Guide

### Using Hardhat Console

```bash
npx hardhat console --network sepolia
```

```javascript
// Connect to deployed contract
const KipuBankV2 = await ethers.getContractFactory("KipuBankV2");
const bank = await KipuBankV2.attach("YOUR_CONTRACT_ADDRESS");

// Deposit 0.1 ETH
await bank.depositETH({ value: ethers.parseEther("0.1") });

// Check your balance (returns value in 6 decimals)
const balance = await bank.getMyBalance(ethers.ZeroAddress);
console.log("Balance:", ethers.formatUnits(balance, 6), "normalized units");

// Get USD value
const usdValue = await bank.convertToUSD(
  ethers.ZeroAddress, 
  ethers.parseEther("0.1")
);
console.log("USD Value:", ethers.formatUnits(usdValue, 6), "USD");

// Withdraw (amount in 6 decimals)
await bank.withdrawETH(ethers.parseUnits("50", 6)); // Withdraw 50 normalized units

// View all your balances
const [tokens, balances] = await bank.getAllBalances(yourAddress);

// View transaction history
const history = await bank.getTransactionHistory(yourAddress);
```

### Using Etherscan

1. **Navigate to your contract** on Etherscan
2. **Connect wallet** (Write Contract tab)
3. **Deposit ETH**:
   - Function: `depositETH`
   - Payable amount: `0.1` ETH
   - Click "Write"
4. **Check Balance**:
   - Function: `getMyBalance`
   - Token: `0x0000000000000000000000000000000000000000`
   - Click "Query"

### Using Web3.js/Ethers.js

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const bank = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// Deposit
const tx = await bank.depositETH({ 
  value: ethers.parseEther("0.5") 
});
await tx.wait();

// Listen for events
bank.on("Deposit", (user, token, amount, valueUSD, newBalance) => {
  console.log(`${user} deposited ${amount} worth $${valueUSD}`);
});
```

---

## 🤔 Design Decisions & Trade-offs

### 1. **USD-Based Accounting**

**Decision**: Use USD as the unit of account for caps and limits instead of native asset amounts.

**Rationale**:
- More intuitive for users (everyone understands $1000 limit)
- Fair across different assets (1 ETH ≠ 1 USDC in value)
- Prevents manipulation through low-value tokens

**Trade-off**: Requires oracle dependency and gas for price lookups

---

### 2. **6-Decimal Normalization**

**Decision**: Store all balances in 6 decimals internally (USDC standard).

**Rationale**:
- Consistent accounting regardless of token decimals
- Easier balance comparisons
- Industry standard (most stablecoins use 6)

**Trade-off**: 
- Precision loss for tokens with >6 decimals (minimal impact)
- Additional gas for decimal conversion
- Must convert back to native decimals on withdrawal

---

### 3. **address(0) for Native ETH**

**Decision**: Use zero address to represent native ETH in our system.

**Rationale**:
- Common pattern in DeFi (Uniswap, Aave use this)
- Allows unified interface for ETH and ERC20
- No token contract for ETH, so address(0) is semantic

**Trade-off**: Requires special handling in withdraw logic

---

### 4. **Chainlink Price Feeds**

**Decision**: Use Chainlink for all price data instead of DEX prices (like Uniswap TWAP).

**Rationale**:
- More secure (no flash loan manipulation)
- Professional-grade oracles
- Already aggregated from multiple sources

**Trade-off**:
- Centralization point (trust Chainlink)
- Not all tokens have feeds
- Potential staleness (mitigated with 1-hour check)

---

### 5. **Separate Deposit Functions**

**Decision**: `depositETH()` and `depositERC20()` instead of single function.

**Rationale**:
- Clearer intent (less error-prone)
- ETH requires payable, ERC20 doesn't
- Better UX (users know which to call)

**Trade-off**: Slightly more code, but safer and clearer

---

### 6. **Role-Based Access Control**

**Decision**: Use OpenZeppelin AccessControl with multiple roles.

**Rationale**:
- Separation of concerns (admin vs emergency)
- Battle-tested library
- Flexible role management

**Trade-off**: More gas vs. simple Ownable, but worth it for security

---

### 7. **Transaction History Array**

**Decision**: Store transactions in array per user.

**Rationale**:
- Easy to query full history
- Useful for analytics/UX

**Trade-off**: 
- Unbounded array growth (gas concern for very active users)
- Alternative: Use events only and query off-chain

---

### 8. **Pausable Pattern**

**Decision**: Implement pause functionality.

**Rationale**:
- Crisis management (hack, oracle failure)
- Standard in production contracts
- Can stop damage before upgrade

**Trade-off**: Centralization point, but necessary for security

---

## 🔒 Security

### Security Measures Implemented

1. **Checks-Effects-Interactions (CEI)**
   - All state changes before external calls
   - Prevents reentrancy attacks

2. **SafeERC20**
   - Handles tokens with non-standard returns
   - Prevents token transfer failures

3. **Price Feed Validation**
   - Checks for stale data (>1 hour)
   - Validates positive prices
   - Verifies round data consistency

4. **Input Validation**
   - All amounts checked for zero
   - Asset existence verified
   - Active status confirmed

5. **Access Control**
   - Critical functions role-protected
   - Emergency pause capability
   - Role hierarchy enforced

6. **Custom Errors**
   - Gas efficient
   - Clear error messages
   - Type-safe

### Known Limitations

1. **Oracle Dependency**: Contract relies on Chainlink availability
2. **Decimal Precision**: Very small amounts (<1e-6) cannot be represented
3. **Transaction History**: Unlimited growth could become gas-intensive
4. **Single Price Feed**: No fallback oracle (could be added in V3)

### Audit Recommendations

Before mainnet deployment:
- [ ] Professional security audit
- [ ] Formal verification of critical functions
- [ ] Testnet stress testing with various tokens
- [ ] Gas optimization review
- [ ] Edge case testing (all decimals: 0, 6, 8, 18)

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/KipuBankV2.test.js

# Run with coverage
npx hardhat coverage
```

### Test Scenarios Covered

- ✅ Deployment and initialization
- ✅ Asset addition (valid and invalid)
- ✅ ETH deposits (below and above cap)
- ✅ ERC20 deposits
- ✅ Withdrawals (valid amounts and limits)
- ✅ Insufficient balance scenarios
- ✅ Price feed validation
- ✅ Decimal normalization
- ✅ USD conversion accuracy
- ✅ Role-based access
- ✅ Emergency pause/unpause
- ✅ Transaction history tracking
- ✅ Stale price detection

---

## 📍 Contract Address

### Sepolia Testnet

- **Contract Address**: `0xYourDeployedAddress`
- **Network**: Ethereum Sepolia
- **Block Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0xYourDeployedAddress)
- **Verification**: ✅ Verified

### Configuration

- **Withdrawal Limit**: $1,000 USD
- **Bank Cap**: $1,000,000 USD
- **Supported Assets**: ETH (more can be added)
- **Admin**: [Deployer Address]

---

## 📚 Additional Resources

### Chainlink Price Feeds (Sepolia)

| Asset | Address |
|-------|---------|
| ETH/USD | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |
| BTC/USD | `0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43` |
| LINK/USD | `0xc59E3633BAAC79493d908e63626716e204A45EdF` |

[View all feeds](https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet)

### Documentation Links

- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds)
- [Solidity Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Hardhat Documentation](https://hardhat.org/docs)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Kipu Bank Team**
- GitHub: [@yourusername](https://github.com/yourusername)
- Twitter: [@yourhandle](https://twitter.com/yourhandle)

---

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Chainlink for reliable oracle infrastructure
- Ethereum community for best practices and patterns
- Kipu program for educational framework

---

## 📞 Support

For questions or issues:
- Open an issue on GitHub
- Contact via [email]
- Join our [Discord/Telegram]

---

**⚠️ Disclaimer**: This is educational software. Use at your own risk. Always audit smart contracts before mainnet deployment.
