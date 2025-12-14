const hre = require("hardhat");

async function main() {

  const [deployer] = await hre.ethers.getSigners();
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  const withdrawalLimitUSD = 1000 * 1e6;

  const priceFeeds = {
    sepolia: {
      ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
      BTC_USD: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
      LINK_USD: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
      USDC_USD: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E"
    },
  };

  const currentPriceFeeds = priceFeeds[hre.network.name] || priceFeeds.sepolia;

  const KipuBankV2 = await hre.ethers.getContractFactory("KipuBankV2");
  const kipuBankV2 = await KipuBankV2.deploy(withdrawalLimitUSD);

  await kipuBankV2.waitForDeployment();

  const contractAddress = await kipuBankV2.getAddress();

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    await kipuBankV2.deploymentTransaction().wait(6);
  }
  
  try {
    
    const ethTx = await kipuBankV2.addAsset(
      hre.ethers.ZeroAddress,
      18,
      currentPriceFeeds.ETH_USD
    );
    
    await ethTx.wait();
    
    const ethPrice = await kipuBankV2.getTokenPriceUSD(hre.ethers.ZeroAddress);
    
  } catch (error) {
    console.log("   ⚠️  Error adding ETH:", error.message);
    console.log("   You can add it manually later using the addAsset function");
  }

  console.log();
  console.log("=".repeat(70));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log();
  console.log("Contract Information:");
  console.log("  • Name:              KipuBankV2");
  console.log("  • Address:          ", contractAddress);
  console.log("  • Network:          ", hre.network.name);
  console.log("  • Deployer:         ", deployer.address);
  console.log();
  console.log("Configuration:");
  console.log("  • Withdrawal Limit:  $1,000 USD");
  console.log("  • Bank Cap:          $1,000,000 USD");
  console.log("  • Accounting:        6 decimals");
  console.log();
  console.log("Initial Assets:");
  console.log("  • Native ETH:        ✅ Supported");
  console.log();
  console.log("Roles Granted:");
  console.log("  • DEFAULT_ADMIN:     " + deployer.address);
  console.log("  • ADMIN_ROLE:        " + deployer.address);
  console.log("  • EMERGENCY_ROLE:    " + deployer.address);
  console.log();
  console.log("=".repeat(70));

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log();
    console.log("🔍 CONTRACT VERIFICATION");
    console.log("=".repeat(70));
    console.log();
    console.log("Run this command to verify on Etherscan:");
    console.log();
    console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress} "${withdrawalLimitUSD}"`);
    console.log();
    console.log("=".repeat(70));
  }

  // Next steps
  console.log();
  console.log("📋 NEXT STEPS");
  console.log("=".repeat(70));
  console.log();
  console.log("1. ✅ Deploy contract");
  console.log("2. ✅ Add native ETH support");
  console.log("3. ⬜ Verify contract on block explorer");
  console.log("4. ⬜ Add additional ERC20 tokens (optional)");
  console.log("5. ⬜ Test deposit and withdrawal functions");
  console.log("6. ⬜ Update README.md with contract address");
  console.log("7. ⬜ Grant additional roles if needed");
  console.log("8. ⬜ Push to GitHub");
  console.log();
  console.log("=".repeat(70));

  // Adding additional assets example
  console.log();
  console.log("💡 ADDING ADDITIONAL ASSETS");
  console.log("=".repeat(70));
  console.log();
  console.log("To add more tokens, use the following pattern:");
  console.log();
  console.log("// Example: Add LINK token");
  console.log(`await kipuBankV2.addAsset(`);
  console.log(`  "0xLINK_TOKEN_ADDRESS",`);
  console.log(`  18, // LINK decimals`);
  console.log(`  "${currentPriceFeeds.LINK_USD}" // LINK/USD price feed`);
  console.log(`);`);
  console.log();
  console.log("Available Sepolia Price Feeds:");
  console.log("  • ETH/USD:  ", currentPriceFeeds.ETH_USD);
  console.log("  • BTC/USD:  ", currentPriceFeeds.BTC_USD);
  console.log("  • LINK/USD: ", currentPriceFeeds.LINK_USD);
  console.log("  • USDC/USD: ", currentPriceFeeds.USDC_USD);
  console.log();
  console.log("=".repeat(70));

  // Interaction examples
  console.log();
  console.log("🎮 INTERACTION EXAMPLES");
  console.log("=".repeat(70));
  console.log();
  console.log("Using Hardhat Console:");
  console.log("-".repeat(70));
  console.log();
  console.log("// Connect to contract");
  console.log(`const bank = await ethers.getContractAt("KipuBankV2", "${contractAddress}");`);
  console.log();
  console.log("// Deposit 0.1 ETH");
  console.log(`await bank.depositETH({ value: ethers.parseEther("0.1") });`);
  console.log();
  console.log("// Check your balance (returns in 6 decimals)");
  console.log(`await bank.getMyBalance(ethers.ZeroAddress);`);
  console.log();
  console.log("// Get USD value of 0.1 ETH");
  console.log(`await bank.convertToUSD(ethers.ZeroAddress, ethers.parseEther("0.1"));`);
  console.log();
  console.log("// Withdraw (amount in 6 decimals)");
  console.log(`await bank.withdrawETH(ethers.parseUnits("100", 6));`);
  console.log();
  console.log("// View all your balances");
  console.log(`await bank.getAllBalances(yourAddress);`);
  console.log();
  console.log("// View transaction history");
  console.log(`await bank.getTransactionHistory(yourAddress);`);
  console.log();
  console.log("// Check total value locked");
  console.log(`await bank.totalValueLockedUSD();`);
  console.log();
  console.log("// Check available capacity");
  console.log(`await bank.getAvailableCapacity();`);
  console.log();
  console.log("=".repeat(70));

  // Administrative functions
  console.log();
  console.log("🔐 ADMINISTRATIVE FUNCTIONS");
  console.log("=".repeat(70));
  console.log();
  console.log("Only for addresses with appropriate roles:");
  console.log();
  console.log("// Grant admin role to another address");
  console.log(`const ADMIN_ROLE = await bank.ADMIN_ROLE();`);
  console.log(`await bank.grantRole(ADMIN_ROLE, "0xNewAdminAddress");`);
  console.log();
  console.log("// Disable an asset (emergency)");
  console.log(`await bank.setAssetStatus("0xTokenAddress", false);`);
  console.log();
  console.log("// Emergency pause");
  console.log(`await bank.emergencyPause();`);
  console.log();
  console.log("// Unpause");
  console.log(`await bank.unpause();`);
  console.log();
  console.log("=".repeat(70));

  // Important links
  console.log();
  console.log("🔗 IMPORTANT LINKS");
  console.log("=".repeat(70));
  console.log();
  console.log("Documentation:");
  console.log("  • OpenZeppelin:  https://docs.openzeppelin.com/contracts");
  console.log("  • Chainlink:     https://docs.chain.link/data-feeds");
  console.log("  • Hardhat:       https://hardhat.org/docs");
  console.log();
  console.log("Block Explorers:");
  if (hre.network.name === "sepolia") {
    console.log("  • Sepolia:       https://sepolia.etherscan.io/address/" + contractAddress);
  } else {
    console.log("  • Explorer:      [Add appropriate explorer URL]");
  }
  console.log();
  console.log("Price Feeds:");
  console.log("  • Chainlink:     https://docs.chain.link/data-feeds/price-feeds/addresses");
  console.log();
  console.log("=".repeat(70));

  // Final message
  console.log();
  console.log("🎉 Deployment Complete!");
  console.log();
  console.log("Your KipuBankV2 contract is ready to use.");
  console.log("Remember to:");
  console.log("  1. Verify the contract on the block explorer");
  console.log("  2. Test thoroughly before adding real value");
  console.log("  3. Document your contract address in README.md");
  console.log("  4. Consider a security audit before mainnet deployment");
  console.log();
  console.log("Happy banking! 🏦💰");
  console.log();
  console.log("=".repeat(70));
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error();
    console.error("❌ DEPLOYMENT FAILED");
    console.error("=".repeat(70));
    console.error();
    console.error("Error:", error.message);
    console.error();
    if (error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    console.error();
    console.error("=".repeat(70));
    process.exit(1);
  });
