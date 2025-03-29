import pytest, brownie, time
from brownie import Market, StoreFactory, AuctionMarket, Administration, network
from scripts.helper_scripts import (
    get_account,
    deploy_mock,
    toWei,
    LOCAL_BLOCKCHAINS,
    ZERO_ADDRESS,
)


def deploy_auction_market():
    if network.show_active() not in LOCAL_BLOCKCHAINS:
        pytest.skip()

    admin = get_account()

    price_feed = deploy_mock()

    administration = Administration.deploy(price_feed.address, {"from": admin})

    market = AuctionMarket.deploy(administration.address, {"from": admin})

    set_tx = administration.setAuctionMarketContractAddress(market.address, {"from": admin})
    set_tx.wait(1)

    return admin, administration, market 

def deploy_market():
    if network.show_active() not in LOCAL_BLOCKCHAINS:
        pytest.skip()

    admin = get_account()

    price_feed = deploy_mock()

    administration = Administration.deploy(price_feed.address, {"from": admin})

    market = Market.deploy(administration.address, {"from": admin})

    set_tx = administration.setMarketContractAddress(market.address, {"from": admin})
    set_tx.wait(1)

    return admin, administration, market       

def deploy_store_factory():
    if network.show_active() not in LOCAL_BLOCKCHAINS:
        pytest.skip()

    admin = get_account()

    price_feed = deploy_mock()

    administration = Administration.deploy(price_feed.address, {"from": admin})

    store_factory = StoreFactory.deploy(administration.address, {"from": admin})

    set_tx = administration.setStoreFactoryAddress(store_factory.address, {"from": admin})
    set_tx.wait(1)

    return admin, administration, store_factory   



def test_change_market_fee():
    admin, administration, market = deploy_market()

    new_fee = 10 # 0.1%
    change_tx = administration.changeMarketFee(new_fee, {"from": admin})
    change_tx.wait(1)

    market_fee = market.fee()
    assert market_fee == new_fee

def test_change_auction_fee():
    admin, administration, market = deploy_auction_market()

    new_fee = 10 # 0.1%
    change_tx = administration.changeAuctionFee(new_fee, {"from": admin})
    change_tx.wait(1)

    auction_fee = market.fee()
    assert auction_fee == new_fee

def test_change_store_fee():
    admin, administration, market = deploy_store_factory()

    new_fee = 10 # 10$
    change_tx = administration.changeStoreFee(new_fee, {"from": admin})
    change_tx.wait(1)

    store_fee = market.createStoreFee()
    assert store_fee == new_fee
