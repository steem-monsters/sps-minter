//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IERC20 {
  function mint(address to, uint256 amount) external;
  function decimals() external returns (uint256);
}

/// @title A Minter contract for Splinterlands
/// @author Splinterlands Team (@fbslo)

contract Minter {
  using SafeMath for uint256;

  /// @notice Address that can change pools
  address public admin;
  /// @notice Address of the token to mint
  address public token;
  /// @notice Block number when mint() was last called
  uint256 public lastMintBlock;
  /// @notice Total number of tokens already minted
  uint256 public totalMinted;
  /// @notice Maximum number of tokens minted, 3B (with 18 decimal places)
  uint256 public cap = 3000000000000000000000000000;

  /// @notice Struct to store information about each pool
  struct Pool {
    address receiver;
    uint256 amountPerBlock;
  }
  /// @notice Array to store all pools
  Pool[] public pools;

  /// @notice Emitted when mint() is called
  event Mint(address receiver, uint256 amount);
  /// @notice Emitted when pool is added
  event PoolAdded(address newReceiver, uint256 newAmount);
  /// @notice Emitted when pool is updated
  event PoolUpdated(uint256 index, address newReceiver, uint256 newAmount);
  /// @notice Emitted when pool is removed
  event PoolRemoved(uint256 index, address receiver, uint256 amount);
  /// @notice Emitted when admin address is updated
  event UpdateAdmin(address admin, address newAdmin);

  /// @notice Modifier to allow only admin to call certain functions
  modifier onlyAdmin(){
    require(msg.sender == admin, '!admin');
    _;
  }

  /**
   * @notice Constructor of new minter contract
   * @param newToken Address of the token to mint
   * @param startBlock Initial lastMint block
   * @param newAdmin Initial admin address
   */
  constructor(address newToken, uint256 startBlock, address newAdmin){
    require(startBlock >= block.number, "Start block must be above current block");
    require(newToken != address(0), 'Token cannot be address 0');
    require(newAdmin != address(0), 'Admin cannot be address 0');

    token = newToken;
    lastMintBlock = startBlock;
    admin = newAdmin;

    emit UpdateAdmin(address(0), newAdmin);
  }

  /**
   * @notice Mint tokens to all pools, can be called by anyone
   */
  function mint() public {
    uint256 mintDifference = block.number - lastMintBlock;

    for (uint256 i = 0; i < pools.length; i++){
      uint256 amount = pools[i].amountPerBlock.mul(mintDifference);

      if(totalMinted + amount >= cap && totalMinted != cap){
        amount = cap.sub(totalMinted);
      }
      require(totalMinted.add(amount) <= cap, "Cap reached");

      totalMinted = totalMinted.add(amount);
      IERC20(token).mint(pools[i].receiver, amount);

      emit Mint(pools[i].receiver, amount);
    }

    lastMintBlock = block.number;
  }

  /**
   * @notice Add new pool, can be called by admin
   * @param newReceiver Address of the receiver
   * @param newAmount Amount of tokens per block
   */
  function addPool(address newReceiver, uint256 newAmount) external onlyAdmin {
    pools.push(Pool(newReceiver, newAmount));
    emit PoolAdded(newReceiver, newAmount);
  }

  /**
   * @notice Update pool, can be called by admin
   * @param index Index in the array of the pool
   * @param newReceiver Address of the receiver
   * @param newAmount Amount of tokens per block
   */
  function updatePool(uint256 index, address newReceiver, uint256 newAmount) external onlyAdmin {
    mint();
    pools[index] = Pool(newReceiver, newAmount);
    emit PoolUpdated(index, newReceiver, newAmount);
  }

  /**
   * @notice Remove pool, can be called by admin
   * @param index Index in the array of the pool
   */
  function removePool(uint256 index) external onlyAdmin {
    mint();
    address oldReceiver = pools[index].receiver;
    uint256 oldAmount = pools[index].amountPerBlock;

    pools[index] = pools[pools.length - 1];
    pools.pop();
    emit PoolRemoved(index, oldReceiver, oldAmount);
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
