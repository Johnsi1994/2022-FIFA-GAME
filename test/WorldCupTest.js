const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("World Cup", function () {

    async function deployContract() {
        const [owner, user1, user2, user3, user4] = await ethers.getSigners();

        const BettingFactory = await ethers.getContractFactory("Betting");
        const betting = await BettingFactory.deploy();

        const UserBalanceFactory = await ethers.getContractFactory("UserBalance");
        const userBalance = await UserBalanceFactory.deploy();

        const WorldCupFactory = await ethers.getContractFactory("FIFAWorldCup");
        const worldCup = await WorldCupFactory.deploy(betting.address, userBalance.address);

        await betting.updateMainContract(worldCup.address)
        await userBalance.updateMainContract(worldCup.address)

        return { betting, userBalance, worldCup, owner, user1, user2, user3, user4 };
    }

    describe("Deployment", function () {
        const SEMI_FINAL_END_TIME = 1671303600
        const FINAL_END_TIME = 1671390000

        let betting, userBalance, worldCup, owner, user1, user2, user3, user4

        beforeEach(async () => {
            ({ betting, userBalance, worldCup, owner, user1, user2, user3, user4 } =
                await loadFixture(deployContract));
        })

        it("forces error, when bet amount is 0", async function () {
            await expect(
                worldCup.connect(user1)
                    .final_winning_Argentina({ value: ethers.utils.parseEther("0") })
            )
                .to.be.revertedWith("Bet amount must greater than 0")
        })

        it("forces error, when bet amount is over 10", async function () {
            await expect(
                worldCup.connect(user1)
                    .final_winning_Argentina({ value: ethers.utils.parseEther("11") })
            )
                .to.be.revertedWith("Max bet amount is 10 ETH")
        })

        it("forces error, when bet amount is too small", async function () {
            await expect(
                worldCup.connect(user1)
                    .final_winning_Argentina({ value: ethers.utils.parseEther("0.0000000000000001") })
            )
                .to.be.revertedWith("Bet amount too small")
        })

        it("forces error, placeBet can only trigger by main contract(FIFAWorldCup)", async function () {
            await expect(
                userBalance.connect(user1)
                    .placeBet(user1.address, 0, 1, ethers.utils.parseEther("1"))
            )
                .to.be.revertedWith("Only MainContract")
        })

        it("forces error, clearUserShareAmount can only trigger by main contract(FIFAWorldCup)", async function () {
            await expect(
                userBalance.connect(user1)
                    .clearUserShareAmount(user1.address, 0, 1)
            )
                .to.be.revertedWith("Only MainContract")
        })

        it("forces error, updateEventInfo can only trigger by main contract(FIFAWorldCup)", async function () {
            await expect(
                betting.connect(user1)
                    .updateEventInfo(0, 1, 0, 0)
            )
                .to.be.revertedWith("Only MainContract")
        })

        it("forces error, switchEnableSetWinner can only trigger by owner", async function () {
            await expect(
                betting.connect(user1)
                    .switchEnableSetWinner(true)
            )
                .to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("forces error, setWinner can only trigger by owner", async function () {
            await expect(
                betting.connect(user1)
                    .setWinner(0, 1)
            )
                .to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("forces error, setWinner can only set when the game has ended", async function () {
            const current = await time.latest();

            if (current <= SEMI_FINAL_END_TIME) {
                // set timestamp to before SEMI_FINAL_END_TIME
                await time.setNextBlockTimestamp(SEMI_FINAL_END_TIME - 1);

                await expect(betting.setWinner(1, 3))
                    .to.be.revertedWith("Semi-Final game is on going")

                // set timestamp to before FINAL_END_TIME
                await time.setNextBlockTimestamp(FINAL_END_TIME - 1);

                await expect(betting.setWinner(0, 1))
                    .to.be.revertedWith("Final game is on going")
            }
        })

        it("forces error, set wrong team to winner", async function () {
            // switch to enable by owner
            await betting.switchEnableSetWinner(true)
            // set Final team to Semi-Final as winner
            await expect(betting.setWinner(1, 1))
                .to.be.revertedWith("The team is not in this game")
        })

        it("should be able to bet and get the correct share amount", async function () {
            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("0.1") })

            const balance1 = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(balance1).to.equal(100000000000000000n);
        });

        it("should be able to bet and get the correct share amount with 5% bonus", async function () {
            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("1") })

            const balance1 = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(balance1).to.equal(1050000000000000000n);
        });

        it("should be able to rebet and get the correct share amount", async function () {
            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("1") })

            const balance1 = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(balance1).to.equal(1050000000000000000n);

            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("1") })

            const rebetBalance = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(rebetBalance).to.equal(2100000000000000000n);
        });

        it("force error, game haven't sattled", async function () {
            await expect(
                worldCup.connect(user1)
                    .rewardFinal()
            )
                .to.be.revertedWith("The game still on going")
        })

        it("force error, cannot reward if user don't have share", async function () {
            // switch to enable by owner
            await betting.switchEnableSetWinner(true)
            // set winner to Argentina
            await betting.setWinner(0, 1)

            await expect(
                worldCup.connect(user1)
                    .rewardFinal()
            )
                .to.be.revertedWith("You don't have share")
        })

        it("should be able to reward", async function () {
            // User1 bet Argentina win
            // And check User1 has correct share amount
            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("0.2") })

            const balance1 = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(balance1).to.equal(200000000000000000n);


            // User2 bet Argentina win
            // And check User2 has correct share amount
            await worldCup.connect(user2)
                .final_winning_Argentina({ value: ethers.utils.parseEther("0.3") })

            const balance2 = await userBalance.connect(user2)
                .getUserShareAmount(user2.address, 0, 1)

            expect(balance2).to.equal(300000000000000000n);


            // User3 bet France win
            // And check User3 has correct share amount
            await worldCup.connect(user3)
                .final_winning_France({ value: ethers.utils.parseEther("0.5") })

            const balance3 = await userBalance.connect(user3)
                .getUserShareAmount(user3.address, 0, 3)

            expect(balance3).to.equal(500000000000000000n);

            // Set final winner to Argentina
            await betting.switchEnableSetWinner(true);
            await betting.setWinner(0, 1);

            const balanceBefore = await user1.getBalance()

            // User1 reward final game
            await worldCup.connect(user1)
                .rewardFinal()

            const balanceAfter = await user1.getBalance()

            // approximately 400000000000000000
            console.log("reward amount " + (balanceAfter - balanceBefore))
        });
    })

})