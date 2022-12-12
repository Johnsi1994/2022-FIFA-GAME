const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
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

        return { betting, userBalance, worldCup, owner, user1, user2, user3, user4 };
    }

    describe("Deployment", function () {

        it("Should bet final game success and check the right amount", async function () {
            const { betting, userBalance, worldCup, user1, user2 } = await loadFixture(deployContract);

            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("1") })

            const balance1 = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(balance1).to.equal(1050000000000000000n);


            await worldCup.connect(user2)
                .final_winning_France({ value: ethers.utils.parseEther("0.5") })

            const balance2 = await userBalance.connect(user2)
                .getUserShareAmount(user2.address, 0, 3)

            expect(balance2).to.equal(500000000000000000n);
        });

        it("Should rebet success and check right amount", async function () {
            const { betting, userBalance, worldCup, user1, user2 } = await loadFixture(deployContract);

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

        it("Should able to get share", async function () {
            const { betting, userBalance, worldCup, owner, user1, user2, user3 } = await loadFixture(deployContract);

            // User1 bet Brasil win
            // And check User1 correct share amount
            await worldCup.connect(user1)
                .final_winning_Argentina({ value: ethers.utils.parseEther("0.2") })

            const balance1 = await userBalance.connect(user1)
                .getUserShareAmount(user1.address, 0, 1)

            expect(balance1).to.equal(200000000000000000n);


            // User2 bet Brasil win
            // And check User2 correct share amount
            await worldCup.connect(user2)
                .final_winning_Argentina({ value: ethers.utils.parseEther("0.3") })

            const balance2 = await userBalance.connect(user2)
                .getUserShareAmount(user2.address, 0, 1)

            expect(balance2).to.equal(300000000000000000n);


            // User3 bet England win
            // And check User3 correct share amount
            await worldCup.connect(user3)
                .final_winning_France({ value: ethers.utils.parseEther("0.5") })

            const balance3 = await userBalance.connect(user3)
                .getUserShareAmount(user3.address, 0, 3)

            expect(balance3).to.equal(500000000000000000n);

            // Set final winner to Brasil
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