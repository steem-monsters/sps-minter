# Minter contract for Splinterlands

---

Run tests: `npx hardhat test`

---

SPS Minter Smart Contract

We would like to build a smart contract that can be set as the “minter” address for the SPS token on BSC and which we would like to work as follows:

    The contract should contain a list of “pools” where SPS should be minted. Each “pool” should just be a number of tokens per block and a recipient wallet address.

    Finally, there should be a “mint” method (or you can call it something else if you think it’s better). This method will go through the list of pools and mint the specified number of tokens to the recipient address for that pool based on the current block number compared to the block number the last time that the “mint” function was called (or the block number specified in the constructor for the first time “mint” is called). This method should be able to be called by any address.

    There should be methods by which an “admin” wallet address can add a pool, remove a pool, or update an existing pool (can be done by adding and then removing if easier). When these functions are called, it should also first call the “mint” function to mint any tokens that are pending before the changes to the pools go into effect.

    There should also be a method to update the “admin” wallet address (that can only be called by the existing “admin” wallet address).

    UPDATE - Please also have the minter contract cap the total supply of the token at 3 billion. It should not allow any more than 3 billion total SPS tokens to be minted under any circumstances.

Example

As an example, let’s say there are two pools:

    10 SPS / block, recipient address: 0xA1…
    2.5 SPS / block, recipient address: 0xB2…

Let’s assume that the last_mint_block is 13,000,000 (this is the block number of the last time the “mint” function was called), and let’s assume that the “mint” function is being called again in block 13,020,000.

That means that 20,000 blocks have passed between the last_mint_block and the current block so the mint function should mint tokens as follows:

    200,000 tokens to 0xA1… for pool #1 (10 tokens / block * 20k blocks)
    50,000 tokens to 0xB2… for pool #2 (2.5 tokens / block * 20k blocks)
