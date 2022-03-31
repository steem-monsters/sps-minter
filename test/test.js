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
    const Minter = await hre.ethers.getContractFactory("SPSMinter");
    minter = await Minter.deploy(testToken.address, currentBlockNumber + 1, accounts[0].address);
    await minter.deployed();
  }

  it("should add pool", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '100000000000', 50, 100);
    await add.wait();

    let getPool = await minter.getPool(0);
    let getPoolLength = await minter.getPoolLength();

    expect(getPool.receiver).to.equal(accounts[0].address)
    expect(getPool.amountPerBlock.toNumber()).to.equal(100000000000)
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
    let update = await minter.updatePool(0, accounts[0].address, '100000000000000000', 50, 100);
    await update.wait();

    let getPool = await minter.getPool(0);
    let getPoolLength = await minter.getPoolLength();

    expect(getPool.receiver).to.equal(accounts[0].address)
    expect(getPool.amountPerBlock.toString()).to.equal('100000000000000000')
    expect(getPoolLength.toNumber()).to.equal(1)
  });

  it("should mint tokens after reduction", async function () {
    let startLastMintBlock = await minter.lastMintBlock()
    await mineBlocks(60)

    let balanceBefore = await testToken.balanceOf(accounts[0].address)

    let mint = await minter.mint();
    await mint.wait();

    let endLastMintBlock = await minter.lastMintBlock()

    let balance = await testToken.balanceOf(accounts[0].address)
    let getPool = await minter.getPool(0);

    expect(balance.toNumber() - balanceBefore.toNumber()).to.equal(getPool.amountPerBlock.toNumber() * (endLastMintBlock - startLastMintBlock))
  });

  it("should fail when removing invalid pool if there are pools", async function () {
    try {
      let remove = await minter.removePool(1);
      await remove.wait();
    } catch (e){
      expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Index is not valid'")
    }

    let getPoolLength = await minter.getPoolLength();

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

  it("should fail when removing invalid pool if there are no pools", async function () {
    try {
      let remove = await minter.removePool(1);
      await remove.wait();
    } catch (e){
      expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Index is not valid'")
    }

    let getPoolLength = await minter.getPoolLength();

    expect(getPoolLength.toNumber()).to.equal(0)
  });

  it("should update admin", async function () {
    let update = await minter.updateAdmin(accounts[1].address);
    await update.wait();

    let getAdmin = await minter.admin();

    expect(getAdmin).to.equal(accounts[1].address)
  });

  it("should mint 0 tokens if there are 0 pools", async function () {
    await init()

    let mint = await minter.mint();
    await mint.wait();

    let getSupply = await testToken.totalSupply()

    expect(getSupply.toNumber()).to.equal(0)
  });

  it("should revert if cap was reached in previous transaction", async function () {
    await mineBlocks(20)

    try {
      let mint = await minter.mint();
      await mint.wait();
    } catch (e) {
      expect(e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'SPSMinter: Cap reached'")
    }
  });

  it("should mint 0 tokens if 0 blocks elapsed", async function () {
    await init()
    await network.provider.send("evm_setAutomine", [false]);

    let lastBlock = await minter.lastMintBlock()

    await minter.addPool(accounts[0].address, '10000000000', 50, 100);
    await minter.mint(); //mine for the first time
    await minter.mint(); //should mine 0 tokens, since it's in the same block

    await mineBlocks(1);

    let getSupply = await testToken.totalSupply()

    await network.provider.send("evm_setAutomine", [true]);

    expect(getSupply.toString()).to.equal("10000000000")
  });

  it("should add multiple pools", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '10000000000', 50, 100);
    await add.wait();

    let add_2 = await minter.addPool(accounts[1].address, '50000000000', 50, 100);
    await add_2.wait();

    let getPool_1 = await minter.getPool(0);
    let getPool_2 = await minter.getPool(1);

    let getPoolLength = await minter.getPoolLength();

    expect(getPool_1.receiver).to.equal(accounts[0].address)
    expect(getPool_1.amountPerBlock.toString()).to.equal('10000000000')
    expect(getPool_2.receiver).to.equal(accounts[1].address)
    expect(getPool_2.amountPerBlock.toString()).to.equal('50000000000')
    expect(getPoolLength.toNumber()).to.equal(2)
  });

  it("should mint tokens to multiple pools", async function () {
    let startLastMintBlock = await minter.lastMintBlock()
    await mineBlocks(10)

    let mint = await minter.mint();
    await mint.wait();

    let endLastMintBlock = await minter.lastMintBlock()

    let balance_1 = await testToken.balanceOf(accounts[0].address)
    let getPool_1 = await minter.getPool(0);

    let balance_2 = await testToken.balanceOf(accounts[0].address)
    let getPool_2 = await minter.getPool(0);

    expect(balance_1.toNumber()).to.equal(getPool_1.amountPerBlock.toNumber() * (endLastMintBlock - startLastMintBlock))
    expect(balance_2.toNumber()).to.equal(getPool_2.amountPerBlock.toNumber() * (endLastMintBlock - startLastMintBlock))
  });

  it("should add pool with 0 emission and mint 0 tokens to it after 10 blocks", async function () {
    let add = await minter.addPool(accounts[2].address, 0, 50, 100);
    await add.wait();

    let getPool = await minter.getPool(2);

    expect(getPool.receiver).to.equal(accounts[2].address)
    expect(getPool.amountPerBlock.toNumber()).to.equal(0)

    //mint
    let startLastMintBlock = await minter.lastMintBlock()
    await mineBlocks(10)

    let mint = await minter.mint();
    await mint.wait();

    let endLastMintBlock = await minter.lastMintBlock()
    let balance = await testToken.balanceOf(accounts[2].address)

    expect(balance.toNumber()).to.equal(0)
  });

  it("should update emission of one pool by index", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '1000000000000000000', 50, 100);
    await add.wait();

    await mineBlocks(60);

    await (await minter.updateEmissions(0)).wait()

    let pool = await minter.getPool(0)

    expect(pool.amountPerBlock.toString()).to.equal('990000000000000000')
  });

  it("should not update emission of one pool by index if it's not the time yet", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '1000000000000000000', 50, 100);
    await add.wait();

    await mineBlocks(60);

    await (await minter.updateEmissions(0)).wait()
    await (await minter.updateEmissions(0)).wait()
    await (await minter.updateEmissions(0)).wait()

    let pool = await minter.getPool(0)

    expect(pool.amountPerBlock.toString()).to.equal('990000000000000000')
  });

  it("should update emission of one pool by index if enough time has passed", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '1000000000000000000', 50, 100);
    await add.wait();

    await mineBlocks(60);

    await (await minter.updateEmissions(0)).wait()
    await mineBlocks(60);
    await (await minter.updateEmissions(0)).wait()

    let pool = await minter.getPool(0)

    expect(pool.amountPerBlock.toString()).to.equal('980100000000000000')
  });

  it("should update emission of all pools", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '1000000000000000000', 50, 100);
    await add.wait();

    let add2 = await minter.addPool(accounts[0].address, '2000000000000000000', 50, 100);
    await add2.wait();

    await mineBlocks(60);

    await (await minter.updateAllEmissions()).wait()

    let pool = await minter.getPool(0)
    let pool2 = await minter.getPool(1)

    expect(pool.amountPerBlock.toString()).to.equal('990000000000000000')
    expect(pool2.amountPerBlock.toString()).to.equal('1980000000000000000')
  });

  it("should not update emission of all pools if it's not the time yet", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '1000000000000000000', 50, 100);
    await add.wait();

    let add2 = await minter.addPool(accounts[0].address, '2000000000000000000', 50, 100);
    await add2.wait();

    await mineBlocks(60);

    await (await minter.updateAllEmissions()).wait()
    await (await minter.updateAllEmissions()).wait()
    await (await minter.updateAllEmissions()).wait()

    let pool = await minter.getPool(0)
    let pool2 = await minter.getPool(1)

    expect(pool.amountPerBlock.toString()).to.equal('990000000000000000')
    expect(pool2.amountPerBlock.toString()).to.equal('1980000000000000000')
  });

  it("should update emission of all pools if enough time has passed", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '1000000000000000000', 50, 100);
    await add.wait();

    let add2 = await minter.addPool(accounts[0].address, '200000000000000000', 50, 100);
    await add2.wait();

    await mineBlocks(60);

    await (await minter.updateAllEmissions()).wait()
    await mineBlocks(60);
    await (await minter.updateAllEmissions()).wait()

    let pool = await minter.getPool(0)
    let pool2 = await minter.getPool(1)

    expect(pool.amountPerBlock.toString()).to.equal('980100000000000000')
    expect(pool2.amountPerBlock.toString()).to.equal('196020000000000000')
  });

  it("should update amountPerBlock to 0 tokens if amount is under 0.1 token", async function () {
    await init()

    let add = await minter.addPool(accounts[0].address, '10000000000000000', 50, 100); //0.01 token per block
    await add.wait();

    await mineBlocks(60);

    await (await minter.updateAllEmissions()).wait()
    await mineBlocks(60);
    await (await minter.updateAllEmissions()).wait()

    let pool = await minter.getPool(0)

    expect(pool.amountPerBlock.toString()).to.equal('0')
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
