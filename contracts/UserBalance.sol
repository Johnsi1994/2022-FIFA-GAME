// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DataTypes.sol";
import "hardhat/console.sol";

contract UserBalance is Ownable {
    // Main contract address (FIFAWorldCup)
    address private mainContract;

    // user - game - team - share amount
    mapping(address => mapping(Game => mapping(Team => uint256))) userBetInfos;

    function placeBet(
        address user,
        Game game,
        Team team,
        uint256 amount
    ) external returns (uint256) {
        require(msg.sender == mainContract, "Only MainContract !");
        require(amount > 0, "Bet amount must greater than 0");
        require(amount <= 10 ether, "Max bet amount is 10 ETH");
        require((amount / 10000) * 10000 == amount, "Bet amount too small");

        // Give 5% bonus to user if book over 1 eth
        uint256 bonus = 0;
        if (amount >= 1 ether) {
            bonus = (amount * 500) / 10000;
        }
        amount = amount + bonus;
        userBetInfos[user][game][team] += amount;
        return amount;
    }

    function getUserShareAmount(
        address user,
        Game game,
        Team winner
    ) public view returns (uint256) {
        return userBetInfos[user][game][winner];
    }

    function clearUserShareAmount(
        address user,
        Game game,
        Team winner
    ) external {
        require(msg.sender == mainContract, "Only MainContract !");
        userBetInfos[user][game][winner] = 0;
    }

    function updateMainContract(address _newContract) public onlyOwner {
        mainContract = _newContract;
    }
}
