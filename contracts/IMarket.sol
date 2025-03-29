// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStoreFactory {
    function changeCreateStoreFee(uint256 _newFee) external;
}

interface IMarket {
    function changeFee(uint256 _newFee) external;
}
