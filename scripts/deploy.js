const hre = require("hardhat");

let newToken = '0x44883053bfcaf90af0787618173dd56e8c2deb36'
let startBlock = '17511000'
let newAdmin = '0xdf5fd6b21e0e7ac559b41cf2597126b3714f432c'

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
