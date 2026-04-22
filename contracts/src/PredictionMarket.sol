// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20, IERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title PredictionMarket
 * @dev A prediction market contract using AMM for YES/NO token trading
 */
contract PredictionMarket is Ownable {
    // Constants
    uint256 constant FEE_BPS = 30; // 0.3% fee
    uint256 constant YES = 1;
    uint256 constant NO = 2;
    uint256 constant ONE = 1e18;

    // State
    IERC20 public immutable USDC;
    uint256 public marketCount;
    bool public paused;

    // Market states
    enum MarketState { Active, Resolved, Cancelled }
    enum Resolution { Unresolved, Yes, No }

    // Data structures
    struct Market {
        string question;
        string description;
        string resolutionMethod;
        address creator;
        uint256 closesAt;
        uint256 yesReserve;
        uint256 noReserve;
        uint256 totalVolume;
        uint256 liquidity;
        MarketState state;
        Resolution resolution;
    }

    struct Position {
        address holder;
        uint256 amount;
    }

    // Mappings
    mapping(uint256 => Market) public markets;
    mapping(uint256 => ERC20) public marketTokens; // marketId => YES/NO combined token
    mapping(uint256 => mapping(address => uint256)) public yesBalances; // marketId => holder => YES amount
    mapping(uint256 => mapping(address => uint256)) public noBalances; // marketId => holder => NO amount

    // Events
    event MarketCreated(uint256 indexed marketId, string question, uint256 closesAt);
    event MarketResolved(uint256 indexed marketId, Resolution outcome);
    event MarketCancelled(uint256 indexed marketId);
    event Trade(uint256 indexed marketId, address indexed trader, uint256 side, uint256 usdcAmount, uint256 tokenAmount);
    event PayoutClaimed(uint256 indexed marketId, address indexed claimer, uint256 amount);

    /**
     * @dev Constructor
     * @param _usdc USDC token address (use testnet address for testing)
     */
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        USDC = IERC20(_usdc);
    }

    /**
     * @dev Create a new prediction market
     * @param question The market question
     * @param description Detailed description
     * @param resolutionMethod How the market will be resolved
     * @param closesAt Timestamp when market closes
     */
    function createMarket(
        string calldata question,
        string calldata description,
        string calldata resolutionMethod,
        uint256 closesAt
    ) external returns (uint256) {
        require(!paused, "Contract is paused");
        require(closesAt > block.timestamp, "Close time must be in future");

        marketCount++;
        uint256 marketId = marketCount;

        markets[marketId] = Market({
            question: question,
            description: description,
            resolutionMethod: resolutionMethod,
            creator: msg.sender,
            closesAt: closesAt,
            yesReserve: ONE,  // Initial liquidity
            noReserve: ONE,
            totalVolume: 0,
            liquidity: ONE,
            state: MarketState.Active,
            resolution: Resolution.Unresolved
        });

        emit MarketCreated(marketId, question, closesAt);
        return marketId;
    }

    /**
     * @dev Buy YES or NO tokens with USDC
     * @param marketId The market ID
     * @param side YES (1) or NO (2)
     * @param usdcAmount Amount of USDC to spend
     * @return tokenAmount Amount of tokens received
     */
    function buy(uint256 marketId, uint256 side, uint256 usdcAmount) external returns (uint256) {
        require(!paused, "Contract is paused");
        require(side == YES || side == NO, "Invalid side");
        require(usdcAmount > 0, "Amount must be > 0");
        require(markets[marketId].state == MarketState.Active, "Market not active");
        require(block.timestamp < markets[marketId].closesAt, "Market closed");

        Market storage market = markets[marketId];

        // Calculate token output using AMM formula
        uint256 tokenAmount = getAmountOut(marketId, side, usdcAmount);

        // Transfer USDC from user
        require(USDC.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");

        // Update reserves
        if (side == YES) {
            market.yesReserve += usdcAmount;
            market.noReserve -= tokenAmount;
            yesBalances[marketId][msg.sender] += tokenAmount;
        } else {
            market.noReserve += usdcAmount;
            market.yesReserve -= tokenAmount;
            noBalances[marketId][msg.sender] += tokenAmount;
        }

        market.totalVolume += usdcAmount;

        emit Trade(marketId, msg.sender, side, usdcAmount, tokenAmount);
        return tokenAmount;
    }

    /**
     * @dev Sell YES or NO tokens for USDC
     * @param marketId The market ID
     * @param side YES (1) or NO (2)
     * @param tokenAmount Amount of tokens to sell
     * @return usdcAmount Amount of USDC received
     */
    function sell(uint256 marketId, uint256 side, uint256 tokenAmount) external returns (uint256) {
        require(!paused, "Contract is paused");
        require(side == YES || side == NO, "Invalid side");
        require(tokenAmount > 0, "Amount must be > 0");
        require(markets[marketId].state == MarketState.Active, "Market not active");

        Market storage market = markets[marketId];

        // Calculate USDC output
        uint256 usdcAmount = getAmountOut(marketId, side, tokenAmount);

        // Burn tokens from sender
        if (side == YES) {
            require(yesBalances[marketId][msg.sender] >= tokenAmount, "Insufficient balance");
            yesBalances[marketId][msg.sender] -= tokenAmount;
            market.yesReserve -= usdcAmount;
            market.noReserve += tokenAmount;
        } else {
            require(noBalances[marketId][msg.sender] >= tokenAmount, "Insufficient balance");
            noBalances[marketId][msg.sender] -= tokenAmount;
            market.noReserve -= usdcAmount;
            market.yesReserve += tokenAmount;
        }

        // Transfer USDC to user
        require(USDC.transfer(msg.sender, usdcAmount), "USDC transfer failed");

        emit Trade(marketId, msg.sender, side, usdcAmount, tokenAmount);
        return usdcAmount;
    }

    /**
     * @dev Calculate output amount using AMM formula
     * @param marketId The market ID
     * @param side YES (1) or NO (2)
     * @param amountIn Amount of input (USDC or tokens)
     */
    function getAmountOut(uint256 marketId, uint256 side, uint256 amountIn) public view returns (uint256) {
        Market storage market = markets[marketId];

        uint256 inputReserve = side == YES ? market.yesReserve : market.noReserve;
        uint256 outputReserve = side == YES ? market.noReserve : market.yesReserve;

        // Constant product formula: x * y = k
        // With fee: (amountIn * 997) / 1000
        uint256 amountInWithFee = amountIn * (10000 - FEE_BPS) / 10000;
        uint256 numerator = amountInWithFee * outputReserve;
        uint256 denominator = inputReserve + amountInWithFee;

        return numerator / denominator;
    }

    /**
     * @dev Get current YES price in USDC
     * @param marketId The market ID
     * @return price Price of YES token
     */
    function getYesPrice(uint256 marketId) external view returns (uint256) {
        Market storage market = markets[marketId];
        if (market.yesReserve == 0) return 0;
        // Price = noReserve / yesReserve (simplified)
        return (market.noReserve * ONE) / market.yesReserve;
    }

    /**
     * @dev Get current NO price in USDC
     * @param marketId The market ID
     * @return price Price of NO token
     */
    function getNoPrice(uint256 marketId) external view returns (uint256) {
        Market storage market = markets[marketId];
        if (market.noReserve == 0) return 0;
        return (market.yesReserve * ONE) / market.noReserve;
    }

    /**
     * @dev Resolve a market
     * @param marketId The market ID
     * @param outcome Resolution (1 = Yes, 2 = No)
     */
    function resolveMarket(uint256 marketId, uint256 outcome) external {
        Market storage market = markets[marketId];
        require(msg.sender == owner() || msg.sender == market.creator, "Only owner or creator can resolve");
        require(market.state == MarketState.Active, "Market not active");
        require(outcome == YES || outcome == NO, "Invalid outcome");
        require(block.timestamp >= market.closesAt, "Market not closed yet");

        market.state = MarketState.Resolved;
        market.resolution = outcome == YES ? Resolution.Yes : Resolution.No;

        emit MarketResolved(marketId, market.resolution);
    }

    /**
     * @dev Cancel a market (only owner or creator)
     * @param marketId The market ID
     */
    function cancelMarket(uint256 marketId) external {
        require(msg.sender == owner() || msg.sender == markets[marketId].creator, "Only owner or creator can cancel");
        require(markets[marketId].state == MarketState.Active, "Market not active");

        markets[marketId].state = MarketState.Cancelled;
        emit MarketCancelled(marketId);
    }

    /**
     * @dev Claim payout after market resolution
     * @param marketId The market ID
     * @param holder Address to claim for
     */
    function claimPayout(uint256 marketId, address holder) external {
        Market storage market = markets[marketId];
        require(market.state == MarketState.Resolved, "Market not resolved");
        require(market.resolution != Resolution.Unresolved, "No resolution");

        uint256 payout = 0;

        if (market.resolution == Resolution.Yes) {
            payout = yesBalances[marketId][holder];
            require(payout > 0, "No winning position");
            yesBalances[marketId][holder] = 0;
        } else {
            payout = noBalances[marketId][holder];
            require(payout > 0, "No winning position");
            noBalances[marketId][holder] = 0;
        }

        // Payout is 1:1 at resolution (each winning token pays 1 USDC)
        require(USDC.transfer(holder, payout), "USDC transfer failed");

        emit PayoutClaimed(marketId, holder, payout);
    }

    /**
     * @dev Get market details
     * @param marketId The market ID
     */
    function getMarket(uint256 marketId) external view returns (
        string memory question,
        string memory description,
        uint256 closesAt,
        uint256 yesReserve,
        uint256 noReserve,
        uint256 totalVolume,
        MarketState state,
        Resolution resolution,
        address creator
    ) {
        Market storage market = markets[marketId];
        return (
            market.question,
            market.description,
            market.closesAt,
            market.yesReserve,
            market.noReserve,
            market.totalVolume,
            market.state,
            market.resolution,
            market.creator
        );
    }

    /**
     * @dev Get user position in a market
     * @param marketId The market ID
     * @param holder The holder address
     */
    function getPosition(uint256 marketId, address holder) external view returns (uint256 yesAmount, uint256 noAmount) {
        return (yesBalances[marketId][holder], noBalances[marketId][holder]);
    }

    /**
     * @dev Pause/unpause contract
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}