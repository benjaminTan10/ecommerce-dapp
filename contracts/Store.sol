// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IFactory.sol";

contract Store {
    //--------------------------------------------------------------------
    // VARIABLES

    address public factory;
    address payable public owner;
    string public storeMetaData;

    uint256 public productIds;
    uint256 public orderIds;

    StoreProduct[] public storeProducts;
    ProductOrder[] public storeOrders;
    mapping(uint256 => ProductReview[]) productsReviewMapping;
    
    uint256 constant private FEE = 3; // fee = 0.3%

    enum Type {
        FIXED,
        UNLIMITED
    }
    enum Status {
        PENDING,
        SENT,
        COMPLETED
    }

    struct StoreProduct {
        uint256 productId;
        string name;
        string description;
        string image;
        uint256 priceInUSD;
        uint256 quantity;
        uint256 activeOrders;
        Type productType;
        uint256 listed_on;
    }

    struct ProductOrder {
        uint256 orderId;
        uint256 productId;
        address payable buyer;
        uint256 orderQuantity;
        uint256 orderTotalBuyPriceInETH;
        bool hasBeenReviewed;
        Status orderStatus;
    }

    struct ProductReview {
        address buyer;
        string rating;
        string review;
    }

    //--------------------------------------------------------------------
    // MODIFIERS

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this");
        _;
    }

    //--------------------------------------------------------------------
    // CONSTRUCTOR

    constructor(
        address _factory,
        address _owner,
        string memory _storeMetaData
    ) {
        owner = payable(_owner);
        storeMetaData = _storeMetaData;
        factory = _factory;
    }

    //--------------------------------------------------------------------
    // FUNCTIONS

    function addProduct(
        string memory _name,
        string memory _description,
        string memory _image,
        uint256 _price,
        uint256 _quantity,
        Type _type
    ) public onlyOwner {
        if (_type == Type.FIXED) {
            storeProducts.push(
                StoreProduct(
                    productIds,
                    _name,
                    _description,
                    _image,
                    _price,
                    _quantity,
                    0,
                    Type.FIXED,
                    block.timestamp
                )
            );
        } else {
            storeProducts.push(
                StoreProduct(
                    productIds,
                    _name,
                    _description,
                    _image,
                    _price,
                    1,
                    0,
                    Type.UNLIMITED,
                    block.timestamp
                )
            );
        }
        productIds++;
    }

    function createBuyOrder(uint256 _productId, uint256 _quantity)
        public
        payable
    {
        StoreProduct memory product = storeProducts[_productId];

        uint256 priceInETH = _convertUSDToETH(product.priceInUSD);

        if (product.productType == Type.FIXED) {
            require(_quantity <= product.quantity, "unsuffisant quantity");
            require(msg.value == priceInETH * _quantity, "unsuffisant amount");

            ProductOrder memory order = ProductOrder(
                orderIds,
                _productId,
                payable(msg.sender),
                _quantity,
                priceInETH * _quantity,
                false,
                Status.PENDING
            );
            storeOrders.push(order);
        } else {
            require(msg.value == priceInETH, "unsuffisant amount");

            ProductOrder memory order = ProductOrder(
                orderIds,
                _productId,
                payable(msg.sender),
                0,
                priceInETH,
                false,
                Status.PENDING
            );
            storeOrders.push(order);
        }

        product.activeOrders++;
        storeProducts[_productId] = product;

        orderIds++;
    }

    function fillOrder(uint256 _orderId) public onlyOwner {
        require(_orderId < orderIds, "wrong order id");

        ProductOrder memory order = storeOrders[_orderId];

        require(order.orderStatus == Status.PENDING, "invalid order status");

        StoreProduct memory product = storeProducts[order.productId];

        product.quantity -= order.orderQuantity;
        order.orderStatus = Status.SENT;

        storeOrders[_orderId] = order;
        storeProducts[order.productId] = product;
    }

    function confirmRecieved(uint256 _orderId) public {
        require(_orderId < orderIds, "wrong order id");
        ProductOrder memory order = storeOrders[_orderId];

        require(
            msg.sender == order.buyer && order.orderStatus == Status.SENT,
            "invalid order status"
        );

        uint256 totalAmount = order.orderTotalBuyPriceInETH;
        uint256 fee = (totalAmount * FEE) / 1000;
        uint256 priceMinusFee = totalAmount - fee;

        order.orderStatus = Status.COMPLETED;
        storeOrders[_orderId] = order;
        storeProducts[order.productId].activeOrders--;

        owner.transfer(priceMinusFee);
        payable(factory).transfer(fee);
    }

    function cancelOrder(uint256 _orderId) public {
        ProductOrder memory order = storeOrders[_orderId];

        require(
            msg.sender == order.buyer && order.orderStatus == Status.PENDING,
            "invalid order status"
        );

        uint256 totalAmount = order.orderTotalBuyPriceInETH;

        order.buyer.transfer(totalAmount);

        delete storeOrders[_orderId];

        storeProducts[order.productId].activeOrders--;
    }

    function leaveReview(
        uint256 _orderId,
        string memory _rating,
        string memory _review
    ) public {
        require(_orderId < orderIds, "wrong order id");
        ProductOrder memory order = storeOrders[_orderId];
        require(order.orderStatus == Status.COMPLETED, "invalid order status");
        require(!order.hasBeenReviewed, "already reviewed");

        productsReviewMapping[order.productId].push(
            ProductReview(msg.sender, _rating, _review)
        );
        order.hasBeenReviewed = true;
        storeOrders[_orderId] = order;
    }

    function removeProduct(uint256 _productId) public onlyOwner {
        require(_productId <= productIds, "wrong product id");

        StoreProduct memory product = storeProducts[_productId];

        if (product.activeOrders == 0) {
            delete storeProducts[_productId];
        }
    }

    function listStoreProducts() public view returns (StoreProduct[] memory) {
        return storeProducts;
    }

    function listStoreOrders() public view returns (ProductOrder[] memory) {
        return storeOrders;
    }

    function listProductReviews(uint256 _productId)
        public
        view
        returns (ProductReview[] memory)
    {
        return productsReviewMapping[_productId];
    }

    /*

    function getProductDetails(uint256 _productId)
        public
        view
        returns (StoreProduct memory)
    {
        return storeProducts[_productId];
    }

    */

    function _convertUSDToETH(uint256 amountInUSD) public returns (uint256) {
        return IFactory(factory).convertUSDToETH(amountInUSD);
    }
}
