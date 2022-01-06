// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract TestToken {
    string public name = "TEST token";
    string public symbol = "TEST";
    uint32 public decimals = 18;
    uint256 public totalSupply;
    address public owner;
    mapping(address => uint256) public balances;

    constructor(){
      owner = msg.sender;
    }

    function mint(address to, uint256 amount) external {
      balances[to] += amount;
      totalSupply += amount;
    }

    function balanceOf(address user) external view returns (uint256){
      return balances[user];
    }

    function transfer(address to, uint256 amount) external {
      balances[to] += amount;
      balances[msg.sender] -= amount;
    }
}
