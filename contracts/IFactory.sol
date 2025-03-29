// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IFactory {
    function convertUSDToETH(uint256 amountInUSD) external returns (uint256);
}
