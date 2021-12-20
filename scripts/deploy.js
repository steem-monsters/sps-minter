const hre = require("hardhat");

let newToken = ''
let startBlock = ''
let newAdmin = ''

async function main() {
  const Minter = await hre.ethers.getContractFactory("Minter");
  const minter = await Minter.deploy(newToken, startBlock, newAdmin);

  await minter.deployed();

  console.log("Minter deployed to:", minter.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
