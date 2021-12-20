const { expect } = require("chai");
const { ethers } = require("hardhat");

let accounts;
let testToken;
let minter;

describe("Minter", async function () {

  async function init(){
    accounts = await ethers.getSigners();

    const TestToken = await hre.ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy();
    await testToken.deployed();

    let currentBlockNumber = await ethers.provider.getBlockNumber()
    const Minter = await hre.ethers.getContractFactory("Minter");
    minter = await Minter.deploy(testToken.address, currentBlockNumber + 1, accounts[0].address);
    await minter.deployed();
  }

  it("should add pool", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, 1);
    await add.wait();

    let getPool = await minter.getPool(0);
    let getPoolLength = await minter.getPoolLength();

    expect(getPool.receiver).to.equal(accounts[0].address)
    expect(getPool.amountPerBlock.toNumber()).to.equal(1)
    expect(getPoolLength.toNumber()).to.equal(1)
  });

  it("should mint tokens", async function () {
    let startLastMintBlock = await minter.lastMintBlock()
    await mineBlocks(10)

    let mint = await minter.mint();
    await mint.wait();

    let endLastMintBlock = await minter.lastMintBlock()

    let balance = await testToken.balanceOf(accounts[0].address)
    let getPool = await minter.getPool(0);

    expect(balance.toNumber()).to.equal(getPool.amountPerBlock.toNumber() * (endLastMintBlock - startLastMintBlock))
  });

  it("should update pool", async function () {
    let update = await minter.updatePool(0, accounts[0].address, 10);
    await update.wait();

    let getPool = await minter.getPool(0);
    let getPoolLength = await minter.getPoolLength();

    expect(getPool.receiver).to.equal(accounts[0].address)
    expect(getPool.amountPerBlock.toNumber()).to.equal(10)
    expect(getPoolLength.toNumber()).to.equal(1)
  });

  it("should remove pool", async function () {
    let remove = await minter.removePool(0);
    await remove.wait();

    let isError = false;
    try {
      let getPool = await minter.getPool(0);
    } catch (e) { isError = true }

    let getPoolLength = await minter.getPoolLength();

    expect(isError).to.equal(true)
    expect(getPoolLength.toNumber()).to.equal(0)
  });

  it("should update admin", async function () {
    let update = await minter.updateAdmin(accounts[1].address);
    await update.wait();

    let getAdmin = await minter.admin();

    expect(getAdmin).to.equal(accounts[1].address)
  });
});

async function mineBlocks(blockNumber) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
      params: [],
    });
  }
}
