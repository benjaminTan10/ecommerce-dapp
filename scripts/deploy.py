from brownie import Market, StoreFactory, AuctionMarket, Administration, network
from scripts.helper_scripts import get_account, LOCAL_BLOCKCHAINS, deploy_mock

def deploy():
    admin = get_account()

    if network.show_active() in LOCAL_BLOCKCHAINS:
        price_feed = deploy_mock()

    administration = Administration.deploy(price_feed.address, {"from": admin})

    market = Market.deploy(administration.address, {"from": admin})

    store_factory = StoreFactory.deploy(administration.address, {"from": admin})

    auction_market = AuctionMarket.deploy(administration.address, {"from": admin})

    set_tx = administration.setMarketContractAddress(market.address, {"from": admin})
    set_tx.wait(1)

    set_tx = administration.setStoreFactoryAddress(store_factory.address, {"from": admin})
    set_tx.wait(1)

    set_tx = administration.setAuctionMarketContractAddress(auction_market.address, {"from": admin})
    set_tx.wait(1)
    
def main():
    deploy()
