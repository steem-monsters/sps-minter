//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IMintable {
  function mint(address to, uint256 amount) external;
  function decimals() external returns (uint256);
}

/// @title A Minter contract for Splinterlands
/// @author Splinterlands Team (@fbslo)

contract SPSMinter {
  /// @notice Address that can change pools
  address public admin;
  /// @notice Address of the token to mint
  IMintable public immutable token;
  /// @notice Block number when mint() was last called
  uint256 public lastMintBlock;
  /// @notice Total number of tokens already minted
  uint256 public totalMinted;
  /// @notice Maximum number of tokens minted, 3B (with 18 decimal places)
  uint256 constant public cap = 3000000000 ether;
  /// @notice Maximum number of pools
  uint256 constant public poolsCap = 100;
  /// @notice Maximum amount per block to each pool
  uint256 constant public maxToPoolPerBlock = 50 ether;
  // @notice minimum payout before it's rounded to 0
  uint256 constant public minimumPayout = 0.1 ether;

  /// @notice Struct to store information about each pool
  struct Pool {
    address receiver;
    uint256 amountPerBlock;
    uint256 reductionBlocks;
    uint256 reductionPercentage;
    uint256 lastUpdate;
  }
  /// @notice Array to store all pools
  Pool[] public pools;

  /// @notice Emitted when mint() is called
  event Mint(address indexed receiver, uint256 amount);
  /// @notice Emitted when pool is added
  event PoolAdded(address indexed newReceiver, uint256 newAmount, uint256 newReductionBlocks, uint256 newReductionPercentage, uint256 newLastUpdate);
  /// @notice Emitted when pool is updated
  event PoolUpdated(uint256 index, address indexed newReceiver, uint256 newAmount, uint256 newReductionBlocks, uint256 newReductionPercentage, uint256 newLastUpdate);
  /// @notice Emitted when pool is removed
  event PoolRemoved(uint256 index, address indexed receiver, uint256 amount);
  /// @notice Emitted when admin address is updated
  event UpdateAdmin(address indexed admin, address indexed newAdmin);

  /// @notice Modifier to allow only admin to call certain functions
  modifier onlyAdmin(){
    require(msg.sender == admin, 'SPSMinter: Only admin');
    _;
  }

  /**
   * @notice Constructor of new minter contract
   * @param newToken Address of the token to mint
   * @param startBlock Initial lastMint block
   * @param newAdmin Initial admin address
   */
  constructor(address newToken, uint256 startBlock, address newAdmin){
    require(startBlock >= block.number, "SPSMinter: Start block must be above current block");
    require(newToken != address(0), 'SPSMinter: Token cannot be address 0');
    require(newAdmin != address(0), 'SPSMinter: Admin cannot be address 0');

    token = IMintable(newToken);
    lastMintBlock = startBlock;
    admin = newAdmin;

    require(token.decimals() == 18, "SPSMinter: Token doesn't have 18 decimals");

    emit UpdateAdmin(address(0), newAdmin);
  }

  /**
   * @notice Mint tokens to all pools, can be called by anyone
   */
  function mint() public {
    require(totalMinted < cap, "SPSMinter: Cap reached");
    require(block.number > lastMintBlock, "SPSMinter: Mint block not yet reached");
    updateAllEmissions();

    uint256 mintDifference;
    unchecked {
      mintDifference = block.number - lastMintBlock;
    }

    lastMintBlock = block.number;

    uint256 poolsLength = pools.length;
    for (uint256 i = 0; i < poolsLength;){
      uint256 amount = pools[i].amountPerBlock * mintDifference;

      if(totalMinted + amount >= cap){
        unchecked {
          amount = cap - totalMinted;
        }
      }

      unchecked {
        totalMinted = totalMinted + amount;
      }

      if (amount > 0){
        token.mint(pools[i].receiver, amount);
        emit Mint(pools[i].receiver, amount);
      }

      unchecked { ++i; }
    }
  }

  /**
   * @notice Add new pool, can be called by admin
   * @param newReceiver Address of the receiver
   * @param newAmount Amount of tokens per block
   * @param newReductionBlocks Number of blocks between emission reduction
   * @param newReductionPercentage Percentage to reduce emission
   */
  function addPool(address newReceiver, uint256 newAmount, uint256 newReductionBlocks, uint256 newReductionPercentage) external onlyAdmin {
    require(pools.length < poolsCap, 'SPSMinter: Pools cap reached');
    require(newAmount <= maxToPoolPerBlock, 'SPSMinter: Maximum amount per block reached');
    pools.push(Pool(newReceiver, newAmount, newReductionBlocks, newReductionPercentage, block.number));
    emit PoolAdded(newReceiver, newAmount, newReductionBlocks, newReductionPercentage, block.number);
  }

  /**
   * @notice Update pool, can be called by admin
   * @param index Index in the array of the pool
   * @param newReceiver Address of the receiver
   * @param newAmount Amount of tokens per block
   * @param newReductionBlocks Number of blocks between emission reduction
   * @param newReductionPercentage Percentage to reduce emission
   */
  function updatePool(uint256 index, address newReceiver, uint256 newAmount, uint256 newReductionBlocks, uint256 newReductionPercentage) external onlyAdmin {
    require(newAmount <= maxToPoolPerBlock, 'SPSMinter: Maximum amount per block reached');
    mint();
    pools[index] = Pool(newReceiver, newAmount, newReductionBlocks, newReductionPercentage, block.number);
    emit PoolUpdated(index, newReceiver, newAmount, newReductionBlocks, newReductionPercentage, block.number);
  }

  /**
   * @notice Update emissions for one pool
   * @param index Index in the array of the pool
   */
  function updateEmissions(uint256 index) public {
    if (block.number - pools[index].lastUpdate > pools[index].reductionBlocks){
      pools[index].amountPerBlock = (pools[index].amountPerBlock * (100 - pools[index].reductionPercentage)) / 100;
      if (minimumPayout > pools[index].amountPerBlock) pools[index].amountPerBlock = 0;
      pools[index].lastUpdate = block.number;
    }
  }

  /**
   * @notice Update emissions for all pools
   */
  function updateAllEmissions() public {
    uint256 length = pools.length;
    for (uint256 i = 0; i < length;){
      updateEmissions(i);
      unchecked { ++i; }
    }
  }

  /**
   * @notice Remove pool, can be called by admin
   * @param index Index in the array of the pool
   */
  function removePool(uint256 index) external onlyAdmin {
    require(pools.length > index, 'Index is not valid');

    mint();
    emit PoolRemoved(index, pools[index].receiver, pools[index].amountPerBlock);

    unchecked {
      pools[index] = pools[pools.length - 1];
    }
    pools.pop();
  }

  /**
   * @notice Update admin address
   * @param newAdmin Address of the new admin
   */
  function updateAdmin(address newAdmin) external onlyAdmin {
    emit UpdateAdmin(admin, newAdmin);
    admin = newAdmin;
  }

  /**
   * @notice View function to get details about certain pool
   * @param index Index in the array of the pool
   */
  function getPool(uint256 index) external view returns (Pool memory pool) {
    return pools[index];
  }

  /// @notice View function to get the length of `pools` array
  function getPoolLength() external view returns (uint256 poolLength) {
    return pools.length;
  }
}
