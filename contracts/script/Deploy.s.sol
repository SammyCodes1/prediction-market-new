// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

/**
 * @title DeployScript
 * @dev Deployment script for Prediction Market contracts
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory network = vm.envString("NETWORK");

        console.log("Deploying to network:", network);
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        // Get USDC address from env or deploy MockUSDC if not provided
        address usdcAddress;
        try vm.envAddress("USDC_ADDRESS") returns (address addr) {
            usdcAddress = addr;
            console.log("Using existing USDC at:", usdcAddress);
        } catch {
            // Deploy MockUSDC first (for testing)
            MockUSDC usdc = new MockUSDC();
            usdcAddress = address(usdc);
            console.log("MockUSDC deployed at:", usdcAddress);
        }

        // Deploy PredictionMarket with USDC address
        PredictionMarket market = new PredictionMarket(usdcAddress);
        console.log("PredictionMarket deployed at:", address(market));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("USDC:", usdcAddress);
        console.log("PredictionMarket:", address(market));
    }
}

/**
 * @title DeployTestMarketScript
 * @dev Script to create a test market after deployment
 */
contract DeployTestMarketScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address marketAddress = vm.envAddress("MARKET_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        PredictionMarket market = PredictionMarket(marketAddress);

        // Create a test market
        uint256 marketId = market.createMarket(
            "Will Bitcoin exceed $100,000 by end of 2025?",
            "This market resolves to YES if Bitcoin trades above $100,000 USD on any major exchange at any point before the resolution date.",
            "CoinMarketCap BTC/USD price",
            block.timestamp + 365 days // 1 year from now
        );

        console.log("Created market with ID:", marketId);

        vm.stopBroadcast();
    }
}