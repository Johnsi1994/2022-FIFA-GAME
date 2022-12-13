// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DataTypes.sol";
import "hardhat/console.sol";

contract Betting is Ownable {
    // Main contract address (FIFAWorldCup)
    address private mainContract;

    uint256 private constant FINAL_END_TIME = 1671390000;
    uint256 private constant SEMI_FINAL_END_TIME = 1671303600;

    bool enableSetWinner = false;

    struct Event {
        Game game;
        Team homeTeam;
        Team awayTeam;
        // winner could be Unsettled (game haven't end)
        Team winner;
        // total amount of all users has bet in this event
        uint256 totalBetAmount;
        // total share amount of users has bet for home team
        uint256 homeTotalShareAmount;
        // total share amount of users has bet for away team
        uint256 awayTotalShareAmount;
    }

    /**
     * @notice key: Game, value: Event
     */
    mapping(Game => Event) public events;

    constructor() {
        Event memory eventFinal = Event(
            Game.FINAL,
            Team.Argentina,
            Team.France,
            Team.Unsettled,
            0,
            0,
            0
        );

        Event memory eventSemiFinal = Event(
            Game.SEMI_FINAL,
            Team.Croatia,
            Team.Morocco,
            Team.Unsettled,
            0,
            0,
            0
        );

        events[Game.FINAL] = eventFinal;
        events[Game.SEMI_FINAL] = eventSemiFinal;
    }

    function updateMainContract(address _newContract) external onlyOwner {
        mainContract = _newContract;
    }

    function updateEventInfo(
        Game game,
        Team betTeam,
        uint256 _betAmount,
        uint256 _shareAmount
    ) external {
        require(msg.sender == mainContract, "Only MainContract");
        Event storage e = events[game];
        e.totalBetAmount += _betAmount;
        if (betTeam == e.homeTeam) {
            e.homeTotalShareAmount += _shareAmount;
        } else {
            e.awayTotalShareAmount += _shareAmount;
        }
    }

    function switchEnableSetWinner(bool isEnable) external onlyOwner {
        enableSetWinner = isEnable;
    }

    function setWinner(Game game, Team team) external onlyOwner {
        uint256 time = block.timestamp;
        if (game == Game.FINAL) {
            require(
                time >= FINAL_END_TIME || enableSetWinner,
                "Final game is on going"
            );
        } else {
            require(
                time >= SEMI_FINAL_END_TIME || enableSetWinner,
                "Semi-Final game is on going"
            );
        }

        Event storage e = events[game];
        require(
            team == e.homeTeam || team == e.awayTeam,
            "The team is not in this game"
        );

        e.winner = team == e.homeTeam ? e.homeTeam : e.awayTeam;
    }

    function getWinnerEventInfo(Game game)
        public
        view
        returns (
            Team winner,
            uint256 totalBetAmount,
            uint256 winnerTotalShareAmount
        )
    {
        Event memory e = events[game];
        require(e.winner != Team.Unsettled, "The game still on going");

        winner = e.winner;
        totalBetAmount = e.totalBetAmount;
        winnerTotalShareAmount = winner == e.homeTeam
            ? e.homeTotalShareAmount
            : e.awayTotalShareAmount;
    }
}
