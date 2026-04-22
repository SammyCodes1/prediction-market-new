// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Test USDC token for development and testing
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals = 6; // USDC has 6 decimals

    mapping(address => bool) public minters;

    constructor() ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        // Mint initial supply to owner for testing
        _mint(msg.sender, 1_000_000 * 1e6); // 1M USDC
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    // Allow minting from multiple addresses for testing
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
    }

    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
    }

    function mintFrom(address to, uint256 amount) external {
        require(minters[msg.sender], "Not authorized to mint");
        _mint(to, amount);
    }
}