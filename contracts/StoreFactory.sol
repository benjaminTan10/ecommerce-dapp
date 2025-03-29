// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Store.sol";

contract StoreFactory {
    //--------------------------------------------------------------------
    // VARIABLES

    address public factory;

    StoreInfo[] public stores;

    // fee for creating store = 5$
    uint256 public createStoreFee = 5 * 10**18;

    struct StoreInfo {
        address storeAddress;
        address owner;
    }

    //--------------------------------------------------------------------
    // EVENTS

    event StoreCreated(address storeAddress, address owner, uint256 timestamp);

    //--------------------------------------------------------------------
    // MODIFIERS

    modifier onlyAdmin() {
        require(msg.sender == factory, "only admin call");
        _;
    }

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(address _factory) {
        factory = _factory;
    }

    //--------------------------------------------------------------------
    // FUNCTIONS

    function createStore(string memory _storeMetaData) public payable {
        require(
            msg.value == _convertUSDToETH(createStoreFee),
            "insuffisant amount"
        );
        Store newStore = new Store(factory, msg.sender, _storeMetaData);
        stores.push(StoreInfo(address(newStore), msg.sender));

        payable(factory).transfer(msg.value);

        emit StoreCreated(address(newStore), msg.sender, block.timestamp);
    }

    function getAllStores() public view returns (StoreInfo[] memory) {
        return stores;
    }

    function _convertUSDToETH(uint256 amountInUSD) public returns (uint256) {
        return IFactory(factory).convertUSDToETH(amountInUSD);
    }

    //--------------------------------------------------------------------
    // ADMIN FUNCTIONS

    function changeCreateStoreFee(uint256 _newFee) public onlyAdmin {
        createStoreFee = _newFee;
    }
}
