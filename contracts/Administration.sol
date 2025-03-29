// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./IMarket.sol";

contract Administration {
    //--------------------------------------------------------------------
    // VARIABLES

    address payable public admin;
    address public ethUsdPriceFeed;

    address public marketContractAddress;
    address public storeFactoryAddress;
    address public auctionMarketContractAddress;

    //--------------------------------------------------------------------
    // MODIFIERS

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can call this");
        _;
    }

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(address _ethUsdPriceFeed) {
        admin = payable(msg.sender);
        ethUsdPriceFeed = _ethUsdPriceFeed;
    }

    // Allow factory contract to recieve ether
    receive() external payable {}

    //--------------------------------------------------------------------
    // FUNCTIONS

    function setMarketContractAddress(address _mainMarketAddress)
        external
        onlyAdmin
    {
        marketContractAddress = _mainMarketAddress;
    }

    function setStoreFactoryAddress(address _storeFactoryAddress)
        external
        onlyAdmin
    {
        storeFactoryAddress = _storeFactoryAddress;
    }

    function setAuctionMarketContractAddress(address _auctionsContractAddress)
        external
        onlyAdmin
    {
        auctionMarketContractAddress = _auctionsContractAddress;
    }

    function changeMarketFee(uint256 _newFee) external onlyAdmin {
        IMarket(marketContractAddress).changeFee(_newFee);
    }

    function changeAuctionFee(uint256 _newFee) external onlyAdmin {
        IMarket(auctionMarketContractAddress).changeFee(_newFee);
    }

    function changeStoreFee(uint256 _newFee) external onlyAdmin {
        IStoreFactory(storeFactoryAddress).changeCreateStoreFee(_newFee);
    }

    function withdrawBalance() public onlyAdmin {
        admin.transfer(address(this).balance);
    }

    /**
     * @dev Get current ETH/USD price using ChainLink price feed
     * @return the ETH/USD price , the number of decimals used for this price
     */

    function getPrice() public returns (uint256, uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            ethUsdPriceFeed
        );
        (, int256 price, , , ) = priceFeed.latestRoundData();
        uint256 decimals = priceFeed.decimals();
        return (uint256(price), decimals);
    }

    function convertUSDToETH(uint256 amountInUSD) public returns (uint256) {
        (uint256 price, uint256 decimals) = getPrice();
        uint256 convertedPrice = (amountInUSD * 10**decimals) / price;
        return convertedPrice;
    }
}
