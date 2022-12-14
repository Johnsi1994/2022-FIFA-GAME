// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const BettingFactory = await hre.ethers.getContractFactory("Betting");
  const betting = await BettingFactory.deploy();

  const UserBalanceFactory = await hre.ethers.getContractFactory("UserBalance");
  const userBalance = await UserBalanceFactory.deploy();

  const WorldCupFactory = await hre.ethers.getContractFactory("FIFAWorldCup");
  const worldCup = await WorldCupFactory.deploy(
    betting.address,
    userBalance.address,
    { value: hre.ethers.utils.parseEther("0") }
  );

  await betting.updateMainContract(worldCup.address)
  await userBalance.updateMainContract(worldCup.address)

  console.log("worldCup address: " + worldCup.address)
  console.log("betting address: " + betting.address)
  console.log("userBalance address: " + userBalance.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
