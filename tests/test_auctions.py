import pytest, brownie, time
from brownie import AuctionMarket, Administration, network
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

    return admin, market    


AUCTION_DESCRIPTION_URI = "test description uri"
AUCTION_START_PRICE = toWei(3000) # 100$
AUCTION_DURATION_IN_UNIX = 10 * 24 * 3600 # 10 days

AUCTION_STATUS = {"OPEN": 0, "ENDED": 1}

def test_start_auction():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    start_time = start_tx.events["AuctionStarted"]["timestamp"]
    end_time = start_time + AUCTION_DURATION_IN_UNIX

    auction_id = 0
    auction_list = market.getAuctionsList()

    auction = auction_list[auction_id]

    auction_price_in_eth = market._convertUSDToETH.call(AUCTION_START_PRICE)

    assert len(auction_list) == 1
    assert auction[0] == auction_id
    assert auction[1] == seller
    assert auction[2] == AUCTION_DESCRIPTION_URI
    assert auction[3] == AUCTION_START_PRICE
    assert auction[4] == auction_price_in_eth
    assert auction[5] == ZERO_ADDRESS
    assert auction[6] == end_time
    assert auction[7] == AUCTION_STATUS["OPEN"]

def test_bid():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    bidder = get_account(2)
    auction_id = 0
    auction = market.getAuctionsList()[auction_id]
    auction_highest_bid = auction[4] + toWei(0.2)

    bid_tx = market.bid(auction_id, {"from": bidder, "value": auction_highest_bid})
    bid_tx.wait(1)

    auction = market.getAuctionsList()[auction_id]

    bidder_bid_amount = market.getUserBidAmount(bidder, auction_id)

    assert auction[5] == bidder
    assert bidder_bid_amount == auction_highest_bid

def test_withdraw_bid():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    bidder_1 = get_account(2)
    auction_id = 0
    auction = market.getAuctionsList()[auction_id]
    highest_bid_1 = auction[4] + toWei(0.2)

    bid_tx = market.bid(auction_id, {"from": bidder_1, "value": highest_bid_1})
    bid_tx.wait(1)

    bidder_2 = get_account(3)

    auction = market.getAuctionsList()[auction_id]
    highest_bid_2 = auction[4] + toWei(0.1)

    bid_tx = market.bid(auction_id, {"from": bidder_2, "value": highest_bid_2})
    bid_tx.wait(1)

    # bidder 1 can now withdraw it's bid
    withdraw_tx = market.withdrawBid(auction_id, {"from": bidder_1})
    withdraw_tx.wait(1)

    bidder_1_bid_amount = market.getUserBidAmount(bidder_1, auction_id)

    assert bidder_1_bid_amount == 0

def test_bid_less():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    bidder_1 = get_account(2)
    auction_id = 0
    auction = market.getAuctionsList()[auction_id]
    highest_bid_1 = auction[4] + toWei(0.2)

    bid_tx = market.bid(auction_id, {"from": bidder_1, "value": highest_bid_1})
    bid_tx.wait(1)

    bidder_2 = get_account(3)

    auction = market.getAuctionsList()[auction_id]
    highest_bid_2 = auction[4]

    with brownie.reverts("insuffisant amount"):
        bid_tx = market.bid(auction_id, {"from": bidder_2, "value": highest_bid_2})
        bid_tx.wait(1)

def test_bid_twice():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    bidder_1 = get_account(2)
    auction_id = 0

    auction = market.getAuctionsList()[auction_id]
    highest_bid_1 = auction[4] + toWei(0.2)
    bid_tx = market.bid(auction_id, {"from": bidder_1, "value": highest_bid_1})
    bid_tx.wait(1)

    bidder_2 = get_account(3)

    auction = market.getAuctionsList()[auction_id]
    highest_bid_2 = auction[4] + toWei(0.1)
    bid_tx = market.bid(auction_id, {"from": bidder_2, "value": highest_bid_2})
    bid_tx.wait(1)

    auction = market.getAuctionsList()[auction_id]
    bidder_1_outbid = toWei(0.2)
    bid_tx = market.bid(auction_id, {"from": bidder_1, "value": bidder_1_outbid})
    bid_tx.wait(1)

    bidder_1_bid_amount = market.getUserBidAmount(bidder_1, auction_id) 

    auction = market.getAuctionsList()[auction_id]

    new_highest_bid = auction[4]

    assert auction[5] == bidder_1
    assert bidder_1_bid_amount == new_highest_bid
    

def test_outbid():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    bidder_1 = get_account(2)
    auction_id = 0

    auction = market.getAuctionsList()[auction_id]
    highest_bid_1 = auction[4] + toWei(0.2)
    bid_tx = market.bid(auction_id, {"from": bidder_1, "value": highest_bid_1})
    bid_tx.wait(1)

    bidder_2 = get_account(3)

    auction = market.getAuctionsList()[auction_id]
    highest_bid_2 = auction[4] + toWei(0.1)
    bid_tx = market.bid(auction_id, {"from": bidder_2, "value": highest_bid_2})
    bid_tx.wait(1)

    bidder_2_bid_amount = market.getUserBidAmount(bidder_2, auction_id) 

    auction = market.getAuctionsList()[auction_id]

    assert auction[4] == highest_bid_2
    assert auction[5] == bidder_2
    assert bidder_2_bid_amount == highest_bid_2

def test_end_auction_before_fullDuration():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        AUCTION_DURATION_IN_UNIX, 
        {"from": seller}
        )
    start_tx.wait(1)

    bidder = get_account(2)
    auction_id = 0
    auction = market.getAuctionsList()[auction_id]
    auction_highest_bid = auction[4] + toWei(0.2)

    bid_tx = market.bid(auction_id, {"from": bidder, "value": auction_highest_bid})
    bid_tx.wait(1)

    # Ensure that seller can not end auction before the end of the period
    with brownie.reverts("Auction Period not reached yet"):
        end_tx = market.endAuction(auction_id, {"from": seller})
        end_tx.wait(1)

def test_end_auction_after_fullDuration():
    admin, market = deploy_auction_market()

    seller = get_account(1)

    test_duration = 10 # 10 seconds
    start_tx = market.startAuction(
        AUCTION_DESCRIPTION_URI, 
        AUCTION_START_PRICE, 
        test_duration, 
        {"from": seller}
        )
    start_tx.wait(1)

    seller_initial_balance = seller.balance()

    bidder = get_account(2)
    auction_id = 0
    auction = market.getAuctionsList()[auction_id]
    auction_highest_bid = auction[4] + toWei(0.2)

    bid_tx = market.bid(auction_id, {"from": bidder, "value": auction_highest_bid})
    bid_tx.wait(1)

    time.sleep(10)

    end_tx = market.endAuction(auction_id, {"from": seller})
    end_tx.wait(1)

    seller_final_balance = seller.balance()

    auction = market.getAuctionsList()[auction_id]

    highest_bid = auction[4]

    fee = market.fee()

    assert auction[7] == AUCTION_STATUS["ENDED"]
    assert seller_final_balance == float(seller_initial_balance) + (float(highest_bid)* (1000 - fee)) / 1000