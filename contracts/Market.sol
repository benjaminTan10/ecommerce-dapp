// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IFactory.sol";

contract Market {
    //--------------------------------------------------------------------
    // VARIABLES

    address public factory;
    uint256 public fee = 5;

    Product[] public products;

    enum Status {
        REMOVED,
        INSALE,
        PENDING,
        SENT,
        SOLD
    }

    struct Product {
        uint256 id;
        address payable seller;
        string name;
        string description;
        string image;
        uint256 priceInUSD;
        uint256 buyPriceInETH;
        address payable buyer;
        Status status;
        uint256 listed_on;
    }

    //--------------------------------------------------------------------
    // EVENTS

    event ProductAdded(uint256 id, address seller, uint256 timestamp);

    //--------------------------------------------------------------------
    // MODIFIERS

    modifier onlyAdmin() {
        require(msg.sender == factory, "only admin call");
        _;
    }

    modifier onlyBuyer(uint256 _id) {
        require(msg.sender == products[_id].buyer, "only buyer call");
        _;
    }

    modifier onlySeller(uint256 _id) {
        require(msg.sender == products[_id].seller, "only seller call");
        _;
    }

    modifier inStatus(uint256 _id, Status _status) {
        require(products[_id].status == _status, "Wrong status");
        _;
    }

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(address _factory) {
        factory = _factory;
    }

    //--------------------------------------------------------------------
    // FUNCTIONS

    function addProduct(
        string memory _name,
        string memory _description,
        string memory _image,
        uint256 _price
    ) public {
        uint256 productId = products.length;
        products.push(
            Product(
                productId,
                payable(msg.sender),
                _name,
                _description,
                _image,
                _price,
                0,
                payable(address(0)),
                Status.INSALE,
                block.timestamp
            )
        );
    }

    function purchase(uint256 _id) public payable {
        Product memory product = products[_id];

        require(
            msg.sender != product.seller && product.status == Status.INSALE,
            "Invalid purchase"
        );

        uint256 priceInETH = _convertUSDToETH(product.priceInUSD);
        require(msg.value == priceInETH, "insuffisant amount");

        product.buyer = payable(msg.sender);
        product.buyPriceInETH = priceInETH;
        product.status = Status.PENDING;
        products[_id] = product;
    }

    function sendProduct(uint256 _id)
        public
        onlySeller(_id)
        inStatus(_id, Status.PENDING)
    {
        products[_id].status = Status.SENT;
    }

    function confirmRecieved(uint256 _id) public {
        Product memory product = products[_id];

        require(
            msg.sender == product.buyer && product.status == Status.SENT,
            "Confirmation not allowed"
        );

        uint256 priceMinusFee = (product.buyPriceInETH * (1000 - fee)) / 1000;
        uint256 totalFee = (product.buyPriceInETH * fee) / 1000;

        product.status = Status.SOLD;
        products[_id] = product;

        payable(factory).transfer(totalFee);
        product.seller.transfer(priceMinusFee);
    }

    function cancelPurchase(uint256 _id) public {
        Product memory product = products[_id];

        require(
            msg.sender == product.buyer && product.status == Status.PENDING,
            "Cancel not allowed"
        );
        product.buyer.transfer(product.buyPriceInETH);

        product.buyPriceInETH = 0;
        product.status = Status.INSALE;
        product.buyer = payable(address(0));
        products[_id] = product;
    }

    function remove(uint256 _id)
        public
        onlySeller(_id)
        inStatus(_id, Status.INSALE)
    {
        delete products[_id];
    }

    function changePrice(uint256 _id, uint256 _newPrice)
        public
        onlySeller(_id)
        inStatus(_id, Status.INSALE)
    {
        products[_id].priceInUSD = _newPrice;
    }

    function getAllProducts() public view returns (Product[] memory) {
        return products;
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
