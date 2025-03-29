import pytest, brownie
from brownie import StoreFactory, Administration, Store, network
from scripts.helper_scripts import (
    fromWei,
    get_account,
    get_contract,
    deploy_mock,
    toWei,
    LOCAL_BLOCKCHAINS,
    ZERO_ADDRESS,
)


def deploy_store_factory():
    if network.show_active() not in LOCAL_BLOCKCHAINS:
        pytest.skip()

    admin = get_account()

    price_feed = deploy_mock()

    administration = Administration.deploy(price_feed.address, {"from": admin})

    store_factory = StoreFactory.deploy(administration.address, {"from": admin})

    set_tx = administration.setStoreFactoryAddress(store_factory.address, {"from": admin})
    set_tx.wait(1)

    return admin, store_factory    

def create_store(store_factory , owner):

    STORE_META_DATA = "store test meta data"
    # Get store creation fee in USD and convert it to ETH
    create_store_fee =  store_factory._convertUSDToETH(store_factory.createStoreFee())
    create_store_fee.wait(1)

    create_store_fee = create_store_fee.return_value

    create_tx = store_factory.createStore(STORE_META_DATA, {"from": owner, "value": create_store_fee})
    create_tx.wait(1)

    market_stores = store_factory.getAllStores()

    store_address = market_stores[0][0]

    store = get_contract(Store, store_address)

    return store


PRODUCT_NAME = "test product"
PRODUCT_DESCRIPTION = "test description"
PRODUCT_IMAGE = "test product image IPFS url"
PRODUCT_PRICE = toWei(3000) # 100$
PRODUCT_QUANTITY = 100
PRODUCT_TYPE = {"FIXED": 0, "UNLIMITED": 1}

ORDER_STATUS = {"PENDING": 0, "SENT": 1, "COMPLETED": 2}

def test_add_fixed_quantity_product():
    _, store_factory = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    product_id = 0
    product = store.listStoreProducts()[product_id]

    assert product[1] == PRODUCT_NAME
    assert product[2] == PRODUCT_DESCRIPTION
    assert product[3] == PRODUCT_IMAGE
    assert product[4] == PRODUCT_PRICE
    assert product[5] == PRODUCT_QUANTITY
    assert product[6] == 0
    assert product[7] == PRODUCT_TYPE["FIXED"]

def test_add_unlimited_quantity_product():
    _, store_factory = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["UNLIMITED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    product_id = 0
    product = store.listStoreProducts()[product_id]

    assert product[1] == PRODUCT_NAME
    assert product[2] == PRODUCT_DESCRIPTION
    assert product[3] == PRODUCT_IMAGE
    assert product[4] == PRODUCT_PRICE
    assert product[5] == 1
    assert product[6] == 0
    assert product[7] == PRODUCT_TYPE["UNLIMITED"]

def test_remove_product():
    _, store_factory = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    remove_tx = store.removeProduct(0, {"from": store_owner})
    remove_tx.wait(1)

    product_id = 0
    product = store.listStoreProducts()[product_id]

    assert product[1] == "" # name = ""

def test_create_buy_order():
    _, store_factory = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    buyer = get_account(2)

    product_id = 0
    quantity = 5
    product_price = store.listStoreProducts()[product_id][4]

    order_price_in_eth = store._convertUSDToETH.call(product_price) * quantity

    create_tx = store.createBuyOrder(product_id, quantity, {"from": buyer, "value": order_price_in_eth})
    create_tx.wait(1)

    order_id = 0
    store_orders = store.listStoreOrders()
    order = store_orders[order_id]

    assert len(store_orders) == 1
    assert order[0] == order_id # order id
    assert order[1] == product_id # order id
    assert order[2] == buyer # order buyer
    assert order[3] == quantity 
    assert order[4] == order_price_in_eth
    assert order[5] == False
    assert order[6] == ORDER_STATUS["PENDING"]

def test_fill_order():
    _, store_factory = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    buyer = get_account(2)

    product_id = 0
    quantity = 5
    product_price = store.listStoreProducts()[product_id][4]

    order_price_in_eth = store._convertUSDToETH.call(product_price) * quantity

    create_tx = store.createBuyOrder(product_id, quantity, {"from": buyer, "value": order_price_in_eth})
    create_tx.wait(1)

    order_id = 0

    fill_tx = store.fillOrder(order_id, {"from": store_owner})
    fill_tx.wait(1)

    order = store.listStoreOrders()[order_id]

    product = store.listStoreProducts()[product_id]

    assert order[6] == ORDER_STATUS["SENT"]
    assert product[6] == 1
    assert product[5] == PRODUCT_QUANTITY - quantity

def test_confirm_recieved():
    admin, store_factory = deploy_store_factory()
    factory_contract = get_contract(Administration, store_factory.factory())

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory, owner=store_owner)

    factory_initial_balance = factory_contract.balance() 

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    buyer = get_account(2)

    product_id = 0
    quantity = 5
    product_price = store.listStoreProducts()[product_id][4]

    order_price_in_eth = store._convertUSDToETH.call(product_price) * quantity

    create_tx = store.createBuyOrder(product_id, quantity, {"from": buyer, "value": order_price_in_eth})
    create_tx.wait(1)

    order_id = 0

    fill_tx = store.fillOrder(order_id, {"from": store_owner})
    fill_tx.wait(1)

    store_owner_initial_balance = store_owner.balance()

    confirm_tx = store.confirmRecieved(order_id, {"from": buyer})
    confirm_tx.wait(1)

    store_owner_final_balance = store_owner.balance()
    factory_final_balance = factory_contract.balance() 

    order = store.listStoreOrders()[order_id]

    product = store.listStoreProducts()[product_id]

    assert fromWei(order_price_in_eth) ==  5
    assert product[6] == 0
    assert order[6] == ORDER_STATUS["COMPLETED"]
    assert float(store_owner_final_balance) == float(store_owner_initial_balance) + float(order_price_in_eth) * 0.997

    # check that factory recieved the 0.3% fee
    assert factory_final_balance == float(order_price_in_eth) * 0.003 + float(factory_initial_balance)

def test_cancel_order():
    _, store_factory  = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    buyer = get_account(2)

    product_id = 0
    quantity = 5
    product_price = store.listStoreProducts()[product_id][4]

    order_price_in_eth = store._convertUSDToETH.call(product_price) * quantity

    create_tx = store.createBuyOrder(product_id, quantity, {"from": buyer, "value": order_price_in_eth})
    create_tx.wait(1)

    order_id = 0
    cancel_tx = store.cancelOrder(order_id, {"from": buyer})
    cancel_tx.wait(1)

    order = store.listStoreOrders()[order_id]

    assert order[2] == ZERO_ADDRESS # order buyer

def test_leave_review():
    _, store_factory  = deploy_store_factory()

    store_owner = get_account(1)

    store = create_store(store_factory=store_factory , owner=store_owner)

    add_tx = store.addProduct(
        PRODUCT_NAME,
        PRODUCT_DESCRIPTION,
        PRODUCT_IMAGE,
        PRODUCT_PRICE,
        PRODUCT_QUANTITY,
        PRODUCT_TYPE["FIXED"],
        {"from": store_owner}
    )
    add_tx.wait(1)

    buyer = get_account(2)

    product_id = 0
    quantity = 5
    product_price = store.listStoreProducts()[product_id][4]

    order_price_in_eth = store._convertUSDToETH.call(product_price) * quantity

    create_tx = store.createBuyOrder(product_id, quantity, {"from": buyer, "value": order_price_in_eth})
    create_tx.wait(1)

    order_id = 0

    fill_tx = store.fillOrder(order_id, {"from": store_owner})
    fill_tx.wait(1)

    confirm_tx = store.confirmRecieved(order_id, {"from": buyer})
    confirm_tx.wait(1)

    PRODUCT_RATING = "8"
    PRODUCT_REVIEW = "good product"

    leave_review_tx = store.leaveReview(order_id, PRODUCT_RATING, PRODUCT_REVIEW, {"from": buyer})
    leave_review_tx.wait(1)

    review = store.listProductReviews(product_id)[0]

    order = store.listStoreOrders()[order_id]

    assert review[0] == buyer
    assert review[1] == PRODUCT_RATING
    assert review[2] == PRODUCT_REVIEW
    assert order[5] == True
