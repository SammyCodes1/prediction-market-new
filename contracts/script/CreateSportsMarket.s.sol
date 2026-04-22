// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract CreateSportsMarketScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address marketAddress = vm.envAddress("MARKET_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        PredictionMarket market = PredictionMarket(marketAddress);

        // Create the sports market
        uint256 marketId = market.createMarket(
            "Will Man City win the Premier League over Arsenal?",
            "This market resolves to YES if Manchester City finishes above Arsenal in the 2025/26 Premier League table.",
            "Official Premier League standings",
            1780272000 // June 1st, 2026
        );

        console.log("Created sports market with ID:", marketId);

        vm.stopBroadcast();
    }
}
