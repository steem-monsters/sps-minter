const hre = require("hardhat");

let newToken = '0x1633b7157e7638C4d6593436111Bf125Ee74703F'
let startBlock = '15490000'
let newAdmin = '0xdf5Fd6B21E0E7aC559B41Cf2597126B3714f432C'

async function main() {
  const Minter = await hre.ethers.getContractFactory("SPSMinter");
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
