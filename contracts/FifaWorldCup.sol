// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "./oraclizeAPI.sol";
import "./DataTypes.sol";
import "./Betting.sol";
import "./UserBalance.sol";
import "hardhat/console.sol";

contract FIFAWorldCup is Ownable {
    //event NewBet(address addr, uint256 amount);

    uint256 private constant FINAL_START_TIME = 1671375600;
    uint256 private constant SEMI_FINAL_START_TIME = 1671289200;

    Betting private betting;
    UserBalance private userBalance;

    constructor(Betting _betting, UserBalance _userBalance) payable {
        betting = _betting;
        userBalance = _userBalance;
    }

    function final_winning_Argentina() external payable {
        _placeBet(Game.FINAL, Team.Argentina, msg.value);
    }

    function final_winning_France() external payable {
        _placeBet(Game.FINAL, Team.France, msg.value);
    }

    function semi_final_winning_Croatia() external payable {
        _placeBet(Game.SEMI_FINAL, Team.Croatia, msg.value);
    }

    function semi_final_winning_Morocco() external payable {
        _placeBet(Game.SEMI_FINAL, Team.Morocco, msg.value);
    }

    function rewardFinal() external {
        _reward(Game.FINAL);
    }

    function rewardSemiFinal() external {
        _reward(Game.SEMI_FINAL);
    }

    function _reward(Game game) private {
        (
            Team winner,
            uint256 totalBetAmount,
            uint256 winnerTotalShareAmount
        ) = betting.getWinnerEventInfo(game);

        address sender = payable(msg.sender);

        uint256 userShareAmount = userBalance.getUserShareAmount(
            sender,
            game,
            winner
        );

        require(userShareAmount > 0, "You don't have share");

        uint256 reward = (totalBetAmount * userShareAmount) /
            winnerTotalShareAmount;

        userBalance.clearUserShareAmount(sender, game, winner);

        (bool success, ) = sender.call{value: reward}("");
        require(success, "Rewarded fail");
    }

    function _placeBet(
        Game game,
        Team team,
        uint256 amount
    ) private {
        uint256 time = block.timestamp;
        if (game == Game.FINAL) {
            require(time <= FINAL_START_TIME, "Final game has start !");
        } else {
            require(
                time <= SEMI_FINAL_START_TIME,
                "Semi-Final game has start !"
            );
        }

        uint256 share = userBalance.placeBet(msg.sender, game, team, amount);
        betting.updateEventInfo(game, team, amount, share);
    }
}
