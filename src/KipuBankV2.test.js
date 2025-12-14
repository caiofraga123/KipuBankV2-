const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("KipuBankV2", function () {
  
  // Mock Chainlink price feed for testing
  async function deployMockPriceFeed(price) {
    const MockPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
    const priceFeed = await MockPriceFeed.deploy(
      8, // decimals
      price // initial price
    );
    return priceFeed;
  }

  // Fixture to deploy all contracts
  async function deployKipuBankV2Fixture() {
    const [owner, admin, emergency, user1, user2] = await ethers.getSigners();
    
    // Deploy mock price feeds
    const ethPriceFeed = await deployMockPriceFeed(2000_00000000); // $2000
    const usdcPriceFeed = await deployMockPriceFeed(1_00000000); // $1
    
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    
    // Mint USDC to users for testing
    await usdc.mint(user1.address, ethers.parseUnits("10000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("10000", 6));
    
    // Deploy KipuBankV2
    const withdrawalLimitUSD = 1000 * 1e6; // $1000 in 6 decimals
    const KipuBankV2 = await ethers.getContractFactory("KipuBankV2");
    const kipuBank = await KipuBankV2.deploy(withdrawalLimitUSD);
    
    // Grant roles
    const ADMIN_ROLE = await kipuBank.ADMIN_ROLE();
    const EMERGENCY_ROLE = await kipuBank.EMERGENCY_ROLE();
    await kipuBank.grantRole(ADMIN_ROLE, admin.address);
    await kipuBank.grantRole(EMERGENCY_ROLE, emergency.address);
    
    // Add ETH as supported asset
    await kipuBank.addAsset(
      ethers.ZeroAddress,
      18,
      await ethPriceFeed.getAddress()
    );
    
    // Add USDC as supported asset
    await kipuBank.addAsset(
      await usdc.getAddress(),
      6,
      await usdcPriceFeed.getAddress()
    );
    
    return {
      kipuBank,
      ethPriceFeed,
      usdcPriceFeed,
      usdc,
      owner,
      admin,
      emergency,
      user1,
      user2,
      withdrawalLimitUSD
    };
  }

  describe("Deployment", function () {
    it("Should set the correct withdrawal limit", async function () {
      const { kipuBank, withdrawalLimitUSD } = await loadFixture(deployKipuBankV2Fixture);
      expect(await kipuBank.WITHDRAWAL_LIMIT_USD()).to.equal(withdrawalLimitUSD);
    });

    it("Should set the correct bank cap", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      expect(await kipuBank.BANK_CAP_USD()).to.equal(1_000_000 * 1e6);
    });

    it("Should grant deployer all roles", async function () {
      const { kipuBank, owner } = await loadFixture(deployKipuBankV2Fixture);
      
      const DEFAULT_ADMIN = await kipuBank.DEFAULT_ADMIN_ROLE();
      const ADMIN_ROLE = await kipuBank.ADMIN_ROLE();
      const EMERGENCY_ROLE = await kipuBank.EMERGENCY_ROLE();
      
      expect(await kipuBank.hasRole(DEFAULT_ADMIN, owner.address)).to.be.true;
      expect(await kipuBank.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await kipuBank.hasRole(EMERGENCY_ROLE, owner.address)).to.be.true;
    });

    it("Should initialize with zero TVL", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      expect(await kipuBank.totalValueLockedUSD()).to.equal(0);
    });
  });

  describe("Asset Management", function () {
    it("Should allow admin to add new asset", async function () {
      const { kipuBank, admin } = await loadFixture(deployKipuBankV2Fixture);
      const newPriceFeed = await deployMockPriceFeed(1500_00000000);
      
      await expect(
        kipuBank.connect(admin).addAsset(
          "0x0000000000000000000000000000000000000001",
          18,
          await newPriceFeed.getAddress()
        )
      ).to.emit(kipuBank, "AssetAdded");
    });

    it("Should reject duplicate asset", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      const newPriceFeed = await deployMockPriceFeed(2000_00000000);
      
      await expect(
        kipuBank.addAsset(
          ethers.ZeroAddress,
          18,
          await newPriceFeed.getAddress()
        )
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__AssetAlreadyExists");
    });

    it("Should reject invalid price feed", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      
      await expect(
        kipuBank.addAsset(
          "0x0000000000000000000000000000000000000001",
          18,
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__InvalidPriceFeed");
    });

    it("Should allow admin to toggle asset status", async function () {
      const { kipuBank, admin } = await loadFixture(deployKipuBankV2Fixture);
      
      await expect(
        kipuBank.connect(admin).setAssetStatus(ethers.ZeroAddress, false)
      ).to.emit(kipuBank, "AssetStatusUpdated")
        .withArgs(ethers.ZeroAddress, false);
      
      const asset = await kipuBank.supportedAssets(ethers.ZeroAddress);
      expect(asset.isActive).to.be.false;
    });

    it("Should prevent non-admin from adding asset", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const newPriceFeed = await deployMockPriceFeed(1500_00000000);
      
      await expect(
        kipuBank.connect(user1).addAsset(
          "0x0000000000000000000000000000000000000001",
          18,
          await newPriceFeed.getAddress()
        )
      ).to.be.reverted;
    });
  });

  describe("ETH Deposits", function () {
    it("Should accept valid ETH deposit", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(
        kipuBank.connect(user1).depositETH({ value: depositAmount })
      ).to.changeEtherBalances(
        [user1, kipuBank],
        [-depositAmount, depositAmount]
      );
    });

    it("Should emit Deposit event with correct values", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const depositAmount = ethers.parseEther("1.0");
      
      // ETH price is $2000, so 1 ETH = $2000 USD
      const expectedUSD = 2000 * 1e6;
      const expectedNormalized = 1 * 1e6; // 1 ETH normalized to 6 decimals
      
      await expect(
        kipuBank.connect(user1).depositETH({ value: depositAmount })
      ).to.emit(kipuBank, "Deposit")
        .withArgs(
          user1.address,
          depositAmount,
          expectedUSD,
          expectedNormalized
        );
    });

    it("Should update user balance correctly", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const depositAmount = ethers.parseEther("1.0");
      
      await kipuBank.connect(user1).depositETH({ value: depositAmount });
      
      // Balance should be in 6 decimals (normalized)
      const balance = await kipuBank.getMyBalance(ethers.ZeroAddress);
      expect(balance).to.equal(1 * 1e6);
    });

    it("Should update TVL correctly", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const depositAmount = ethers.parseEther("1.0");
      
      await kipuBank.connect(user1).depositETH({ value: depositAmount });
      
      // 1 ETH at $2000 = $2000 USD
      const tvl = await kipuBank.totalValueLockedUSD();
      expect(tvl).to.equal(2000 * 1e6);
    });

    it("Should reject zero deposit", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await expect(
        kipuBank.connect(user1).depositETH({ value: 0 })
      ).to.be.revertedWithCustomError(
        kipuBank,
        "KipuBankV2__DepositAmountMustBeGreaterThanZero"
      );
    });

    it("Should reject deposit exceeding bank cap", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Try to deposit 501 ETH (= $1,002,000 > $1,000,000 cap)
      const hugeDeposit = ethers.parseEther("501");
      
      await expect(
        kipuBank.connect(user1).depositETH({ value: hugeDeposit })
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__BankCapacityExceeded");
    });

    it("Should allow multiple users to deposit", async function () {
      const { kipuBank, user1, user2 } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      await kipuBank.connect(user2).depositETH({ value: ethers.parseEther("2") });
      
      expect(await kipuBank.getMyBalance(ethers.ZeroAddress)).to.equal(0);
      expect(await kipuBank.getVaultBalance(user1.address, ethers.ZeroAddress))
        .to.equal(1 * 1e6);
      expect(await kipuBank.getVaultBalance(user2.address, ethers.ZeroAddress))
        .to.equal(2 * 1e6);
    });

    it("Should reject deposit when asset is inactive", async function () {
      const { kipuBank, user1, admin } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deactivate ETH
      await kipuBank.connect(admin).setAssetStatus(ethers.ZeroAddress, false);
      
      await expect(
        kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__AssetNotActive");
    });
  });

  describe("ERC20 Deposits", function () {
    it("Should accept valid ERC20 deposit", async function () {
      const { kipuBank, usdc, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      
      // Approve transfer
      await usdc.connect(user1).approve(await kipuBank.getAddress(), depositAmount);
      
      await expect(
        kipuBank.connect(user1).depositERC20(await usdc.getAddress(), depositAmount)
      ).to.changeTokenBalance(usdc, user1, -depositAmount);
    });

    it("Should update balance correctly for ERC20", async function () {
      const { kipuBank, usdc, user1 } = await loadFixture(deployKipuBankV2Fixture);
      const depositAmount = ethers.parseUnits("1000", 6);
      
      await usdc.connect(user1).approve(await kipuBank.getAddress(), depositAmount);
      await kipuBank.connect(user1).depositERC20(await usdc.getAddress(), depositAmount);
      
      const balance = await kipuBank.getVaultBalance(
        user1.address,
        await usdc.getAddress()
      );
      expect(balance).to.equal(depositAmount); // Same decimals (6)
    });

    it("Should handle different decimal tokens correctly", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // ETH (18 decimals) deposit
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      
      const ethBalance = await kipuBank.getMyBalance(ethers.ZeroAddress);
      // 1 ETH (18 decimals) normalized to 6 decimals = 1 * 1e6
      expect(ethBalance).to.equal(1 * 1e6);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      // Deposit 2 ETH first
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("2") });
    });

    it("Should allow valid withdrawal", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deposit first
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("2") });
      
      // Withdraw 0.5 normalized units (which is 0.5 ETH)
      const withdrawAmount = ethers.parseUnits("0.5", 6);
      
      await expect(
        kipuBank.connect(user1).withdrawETH(withdrawAmount)
      ).to.changeEtherBalance(user1, ethers.parseEther("0.5"));
    });

    it("Should emit Withdrawal event", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      
      const withdrawAmount = ethers.parseUnits("0.5", 6);
      
      await expect(
        kipuBank.connect(user1).withdrawETH(withdrawAmount)
      ).to.emit(kipuBank, "Withdrawal");
    });

    it("Should reject withdrawal exceeding balance", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      
      // Try to withdraw more than deposited
      const excessiveAmount = ethers.parseUnits("2", 6);
      
      await expect(
        kipuBank.connect(user1).withdrawETH(excessiveAmount)
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__InsufficientBalance");
    });

    it("Should reject withdrawal exceeding USD limit", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deposit 2 ETH
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("2") });
      
      // Try to withdraw 1 ETH = $2000 (exceeds $1000 limit)
      const largeWithdrawal = ethers.parseUnits("1", 6);
      
      await expect(
        kipuBank.connect(user1).withdrawETH(largeWithdrawal)
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__WithdrawalExceedsLimit");
    });

    it("Should update TVL correctly after withdrawal", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      const tvlBefore = await kipuBank.totalValueLockedUSD();
      
      await kipuBank.connect(user1).withdrawETH(ethers.parseUnits("0.25", 6));
      const tvlAfter = await kipuBank.totalValueLockedUSD();
      
      // Should decrease by $500 (0.25 ETH * $2000)
      expect(tvlBefore - tvlAfter).to.equal(500 * 1e6);
    });
  });

  describe("Price Conversion", function () {
    it("Should convert ETH to USD correctly", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      
      const oneEth = ethers.parseEther("1");
      const usdValue = await kipuBank.convertToUSD(ethers.ZeroAddress, oneEth);
      
      // 1 ETH at $2000 = $2000 USD (in 6 decimals)
      expect(usdValue).to.equal(2000 * 1e6);
    });

    it("Should get current token price", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      
      const price = await kipuBank.getTokenPriceUSD(ethers.ZeroAddress);
      
      // Price feed returns 8 decimals
      expect(price).to.equal(2000_00000000);
    });
  });

  describe("View Functions", function () {
    it("Should return all balances for user", async function () {
      const { kipuBank, usdc, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deposit ETH
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      
      // Deposit USDC
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await kipuBank.getAddress(), usdcAmount);
      await kipuBank.connect(user1).depositERC20(await usdc.getAddress(), usdcAmount);
      
      const [tokens, balances] = await kipuBank.getAllBalances(user1.address);
      
      expect(tokens.length).to.equal(2);
      expect(balances[0]).to.equal(1 * 1e6); // ETH balance
      expect(balances[1]).to.equal(1000 * 1e6); // USDC balance
    });

    it("Should return transaction history", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      await kipuBank.connect(user1).withdrawETH(ethers.parseUnits("0.5", 6));
      
      const history = await kipuBank.getTransactionHistory(user1.address);
      
      expect(history.length).to.equal(2);
      expect(history[0].isDeposit).to.be.true;
      expect(history[1].isDeposit).to.be.false;
    });

    it("Should return available capacity", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deposit 1 ETH = $2000
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      
      const available = await kipuBank.getAvailableCapacity();
      
      // $1M - $2000 = $998,000
      expect(available).to.equal((1_000_000 - 2000) * 1e6);
    });

    it("Should return zero capacity when full", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deposit 500 ETH = $1,000,000 (fills cap)
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("500") });
      
      const available = await kipuBank.getAvailableCapacity();
      expect(available).to.equal(0);
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow emergency role to pause", async function () {
      const { kipuBank, emergency } = await loadFixture(deployKipuBankV2Fixture);
      
      await expect(
        kipuBank.connect(emergency).emergencyPause()
      ).to.emit(kipuBank, "EmergencyPause");
      
      expect(await kipuBank.paused()).to.be.true;
    });

    it("Should prevent deposits when paused", async function () {
      const { kipuBank, emergency, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(emergency).emergencyPause();
      
      await expect(
        kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__ContractPaused");
    });

    it("Should prevent withdrawals when paused", async function () {
      const { kipuBank, emergency, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      // Deposit first
      await kipuBank.connect(user1).depositETH({ value: ethers.parseEther("1") });
      
      // Pause
      await kipuBank.connect(emergency).emergencyPause();
      
      await expect(
        kipuBank.connect(user1).withdrawETH(ethers.parseUnits("0.5", 6))
      ).to.be.revertedWithCustomError(kipuBank, "KipuBankV2__ContractPaused");
    });

    it("Should allow admin to unpause", async function () {
      const { kipuBank, emergency, admin } = await loadFixture(deployKipuBankV2Fixture);
      
      await kipuBank.connect(emergency).emergencyPause();
      
      await expect(
        kipuBank.connect(admin).unpause()
      ).to.emit(kipuBank, "Unpaused");
      
      expect(await kipuBank.paused()).to.be.false;
    });

    it("Should prevent non-emergency role from pausing", async function () {
      const { kipuBank, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      await expect(
        kipuBank.connect(user1).emergencyPause()
      ).to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should have correct role hierarchy", async function () {
      const { kipuBank, owner, admin, emergency } = await loadFixture(deployKipuBankV2Fixture);
      
      const ADMIN_ROLE = await kipuBank.ADMIN_ROLE();
      const EMERGENCY_ROLE = await kipuBank.EMERGENCY_ROLE();
      
      expect(await kipuBank.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await kipuBank.hasRole(EMERGENCY_ROLE, emergency.address)).to.be.true;
    });

    it("Should allow role granting by admin", async function () {
      const { kipuBank, owner, user1 } = await loadFixture(deployKipuBankV2Fixture);
      
      const ADMIN_ROLE = await kipuBank.ADMIN_ROLE();
      await kipuBank.connect(owner).grantRole(ADMIN_ROLE, user1.address);
      
      expect(await kipuBank.hasRole(ADMIN_ROLE, user1.address)).to.be.true;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use immutable for withdrawal limit", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      
      // Accessing immutable should be cheaper than storage
      const limit = await kipuBank.WITHDRAWAL_LIMIT_USD();
      expect(limit).to.equal(1000 * 1e6);
    });

    it("Should use constant for bank cap", async function () {
      const { kipuBank } = await loadFixture(deployKipuBankV2Fixture);
      
      const cap = await kipuBank.BANK_CAP_USD();
      expect(cap).to.equal(1_000_000 * 1e6);
    });
  });
});
