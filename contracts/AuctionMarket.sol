// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IFactory.sol";

contract AuctionMarket {
    //--------------------------------------------------------------------
    // VARIABLES

    address payable public factory;
    uint256 public fee = 5;

    Auction[] public auctionsList;

    struct Auction {
        uint256 id;
        address payable seller;
        string itemInformation;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTimstamp;
        Status status;
    }

    mapping(uint256 => mapping(address => uint256)) public auctionBidsMapping;

    enum Status {
        OPEN,
        ENDED
    }

    //--------------------------------------------------------------------
    // EVENTS

    event AuctionStarted(uint256 id, address seller, uint256 timestamp);
    event AuctionEnded(uint256 id, uint256 timestamp);

    //--------------------------------------------------------------------
    // MODIFIERS

    modifier onlyAdmin() {
        require(msg.sender == factory, "only admin can call this");
        _;
    }

    modifier onlySeller(uint256 _auctionId) {
        require(
            msg.sender == auctionsList[_auctionId].seller,
            "only buyer can call this"
        );
        _;
    }

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(address _factory) {
        factory = payable(_factory);
    }

    //--------------------------------------------------------------------
    // FUNCTIONS

    function startAuction(
        string memory _itemInfo,
        uint256 _initialPrice,
        uint256 _duration
    ) public {
        uint256 _id = auctionsList.length;
        uint256 start = block.timestamp;
        uint256 end = start + _duration;
        uint256 highestBidETH = _convertUSDToETH(_initialPrice);

        auctionsList.push(
            Auction(
                _id,
                payable(msg.sender),
                _itemInfo,
                _initialPrice,
                highestBidETH,
                address(0),
                end,
                Status.OPEN
            )
        );

        emit AuctionStarted(_id, msg.sender, start);
    }

    function bid(uint256 _auctionId) public payable {
        Auction memory auction = auctionsList[_auctionId];
        require(block.timestamp < auction.endTimstamp, "Auction Ended");

        bool isInAuctionBidders = _isBidder(msg.sender, _auctionId);
        if (isInAuctionBidders) {
            require(
                auctionBidsMapping[_auctionId][msg.sender] + msg.value >
                    auction.highestBid,
                "insuffisant amount"
            );
            auctionBidsMapping[_auctionId][msg.sender] += msg.value;
        } else {
            require(msg.value > auction.highestBid, "insuffisant amount");
            auctionBidsMapping[_auctionId][msg.sender] = msg.value;
        }

        auction.highestBid = auctionBidsMapping[_auctionId][msg.sender];
        auction.highestBidder = msg.sender;
        auctionsList[_auctionId] = auction;
    }

    function withdrawBid(uint256 _auctionId) public {
        uint256 amount = auctionBidsMapping[_auctionId][msg.sender];

        require(amount > 0, "No Bid found on this auction");
        require(
            auctionsList[_auctionId].highestBidder != msg.sender,
            "Highest Bidder can withdraw funds"
        );

        auctionBidsMapping[_auctionId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function endAuction(uint256 _auctionId) public onlySeller(_auctionId) {
        Auction memory auction = auctionsList[_auctionId];
        require(
            block.timestamp >= auction.endTimstamp,
            "Auction Period not reached yet"
        );

        auction.status = Status.ENDED;
        auctionsList[_auctionId] = auction;
        auction.seller.transfer((auction.highestBid * (1000 - fee)) / 1000);
        factory.transfer((auction.highestBid * fee) / 1000);

        emit AuctionEnded(_auctionId, block.timestamp);
    }

    function _isBidder(address _user, uint256 _auctionId)
        public
        view
        returns (bool)
    {
        if (auctionBidsMapping[_auctionId][_user] > 0) {
            return true;
        } else {
            return false;
        }
    }

    function getUserBidAmount(address _user, uint256 _auctionId)
        public
        view
        returns (uint256)
    {
        return auctionBidsMapping[_auctionId][_user];
    }

    function getAuctionsList() public view returns (Auction[] memory) {
        return auctionsList;
    }

    function _convertUSDToETH(uint256 amountInUSD) public returns (uint256) {
        return IFactory(factory).convertUSDToETH(amountInUSD);
    }

    //--------------------------------------------------------------------
    // ADMIN FUNCTIONS

    function changeFee(uint256 _newFee) public onlyAdmin {
        fee = _newFee;
    }
}
