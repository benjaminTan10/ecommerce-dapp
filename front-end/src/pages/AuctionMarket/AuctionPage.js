import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.css";
import { Table, Button, Form } from "react-bootstrap";
import { ethers, utils } from "ethers";
import axios from "axios";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import { CircularProgress } from "@material-ui/core";
import { useParams } from "react-router-dom";

import { IPFS_GATEWAY } from "./../../utils/ipfsStorage";
import AuctionContract from "../../artifacts/contracts/AuctionMarket.json";
import contractsAddress from "../../artifacts/deployments/map.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
const auctionContractAddress = contractsAddress["5777"]["AuctionMarket"][0];

const auctionStatusMap = { 0: "OPEN", 1: "ENDED" };

function AuctionPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const data = useSelector((state) => state.blockchain.value);

  const [userBid, setUserBid] = useState(0);
  const [auctionState, setAuctionState] = useState({
    seller: "",
    name: "",
    description: "",
    image: "",
    startPrice: 0,
    highest_bid_in_USD: 0,
    highest_bid_in_ETH: 0,
    highestBidder: "",
    endTime: 0,
    status: "",
  });

  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState(0);
  const [isBidder, setIsBidder] = useState(false);

  const updateBalance = async () => {
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };

  const auctionDetails = async (auctionId) => {
    if (id !== undefined) {
      const market = new ethers.Contract(
        auctionContractAddress,
        AuctionContract.abi,
        provider
      );
      const auctions = await market.getAuctionsList();
      const details = auctions[auctionId];
      const _userBid = await market.getUserBidAmount(data.account, auctionId);
      setUserBid(utils.formatUnits(_userBid));

      const _isBidder = Number(utils.formatUnits(_userBid)) !== 0;
      setIsBidder(_isBidder);

      const metadataUrl = details[2].replace("ipfs://", IPFS_GATEWAY);
      let metaData = await axios.get(metadataUrl);
      const imgUrl = metaData.data.image.replace("ipfs://", IPFS_GATEWAY);

      convertPrice(utils.formatUnits(details[5])).then((res) => {
        setAuctionState({
          ...auctionState,
          seller: details[1],
          name: metaData.data.name,
          description: metaData.data.description,
          image: imgUrl,
          startPrice: utils.formatUnits(details[3]),
          highest_bid_in_ETH: utils.formatUnits(details[4]),
          highest_bid_in_USD: utils.formatUnits(details[4]),
          highestBidder: details[5],
          endTime: Number(details[6]),
          status: auctionStatusMap[details[7]],
        });
      });
    }
  };

  const bid = async (auctionId) => {
    try {
      if (auctionId !== undefined) {
        setLoading(true);
        const bid_in_eth = Number(bidAmount);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          auctionContractAddress,
          AuctionContract.abi,
          signer
        );

        const bid_tx = await market.bid(auctionId, {
          value: utils.parseEther(bid_in_eth.toString(), "ether"),
        });
        await bid_tx.wait();

        setLoading(false);
        auctionDetails(auctionId);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  const withdraw = async (id) => {
    try {
      if (id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          auctionContractAddress,
          AuctionContract.abi,
          signer
        );
        const withdraw_tx = await market.withdrawBid(id);
        await withdraw_tx.wait();

        setLoading(false);
        auctionDetails(id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  const endAuction = async (id) => {
    try {
      if (id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          auctionContractAddress,
          AuctionContract.abi,
          signer
        );
        const end_tx = await market.endAuction(id);
        await end_tx.wait();

        setLoading(false);
        auctionDetails(id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  async function convertPrice(amount) {
    const market = new ethers.Contract(
      auctionContractAddress,
      AuctionContract.abi,
      provider
    );
    const price_in_eth = await market.callStatic._convertUSDToETH(
      utils.parseEther(amount, "ether")
    );
    return price_in_eth;
  }

  useEffect(() => {
    auctionDetails(Number(id));
  }, [data.account, data.network, isBidder]);

  return (
    <>
      <div className="row p-2">
        <div className="col-md-7 text-center p-3">
          <div className="p-3">
            {auctionState.status === "OPEN" ? (
              <div>
                Sale of <b>{auctionState.name}</b> for{" "}
                <b>
                  {parseFloat(auctionState.highest_bid_in_ETH).toFixed(4)} ETH
                </b>
              </div>
            ) : (
              <div>
                <b>{auctionState.name}</b> bought for{" "}
                <b>
                  {parseFloat(auctionState.highest_bid_in_ETH).toFixed(4)} ETH
                </b>
              </div>
            )}

            <div>{auctionState.description}</div>
            <br />
            <img
              className="rounded"
              src={auctionState.image}
              height="350px"
              width="560px"
            />
            <br />
            <br />
            {data.account === auctionState.seller ? (
              auctionState.status === "OPEN" ? (
                moment.unix(auctionState.endTime).isBefore(Date.now()) ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      endAuction(id);
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={26} color="#fff" />
                    ) : (
                      "Close"
                    )}
                  </Button>
                ) : (
                  <p>Your auction is open</p>
                )
              ) : (
                <p>This auction is completed</p>
              )
            ) : isBidder ? (
              data.account === auctionState.highestBidder ? (
                auctionState.status === "OPEN" ? (
                  <p>You are the highest bidder</p>
                ) : (
                  <p>You won this auction</p>
                )
              ) : auctionState.status === "OPEN" ? (
                <>
                  <div className="col-md-4" style={{ marginLeft: "35%" }}>
                    <Form.Control
                      type="number"
                      placeholder="Add to your previous Bid"
                      onChange={(e) => {
                        setBidAmount(e.target.value);
                      }}
                    />
                    <br />
                    <Button
                      variant="primary"
                      onClick={() => {
                        bid(id);
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={26} color="#fff" />
                      ) : (
                        "OutBid"
                      )}
                    </Button>
                    <Button
                      style={{ marginLeft: "5px" }}
                      variant="danger"
                      onClick={() => {
                        withdraw(id);
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={26} color="#fff" />
                      ) : (
                        "Withdraw"
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <p>This auction is completed</p>
              )
            ) : auctionState.status === "OPEN" ? (
              <>
                <div className="col-md-3" style={{ marginLeft: "35%" }}>
                  <Form.Control
                    type="number"
                    placeholder="Enter bid amount"
                    onChange={(e) => {
                      setBidAmount(e.target.value);
                    }}
                  />
                  <br />
                  <Button
                    variant="primary"
                    onClick={() => {
                      bid(id);
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={26} color="#fff" />
                    ) : (
                      "Bid"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p>This auction is completed</p>
            )}
          </div>
        </div>
        <div className="col-md-5 p-3">
          <h3 className="text-center p-2">Auction Details</h3>
          <Table responsive>
            <tbody>
              <tr>
                <td className="p-2">Seller</td>
                <td>
                  {data.account === auctionState.seller
                    ? "you are the seller"
                    : auctionState.seller}
                </td>
              </tr>

              <tr>
                <td className="p-2">Auction Status</td>
                <td>{auctionState.status}</td>
              </tr>

              <tr>
                <td className="p-2">Auction End Date</td>
                <td>
                  {moment
                    .unix(auctionState.endTime)
                    .format("MMM D, YYYY, HH:mmA")}
                </td>
              </tr>

              <tr>
                <td className="p-2">Start Price in USD</td>
                <td>{auctionState.startPrice} $</td>
              </tr>

              <tr>
                <td className="p-2">Highest Bid</td>
                <td>
                  {parseFloat(auctionState.highest_bid_in_ETH).toFixed(5)} ETH
                </td>
              </tr>
              <tr>
                <td className="p-2">Highest Bidder</td>
                <td>
                  {data.account === auctionState.highestBidder
                    ? "You are the highest Bidder"
                    : auctionState.highestBidder ===
                      ethers.constants.AddressZero
                    ? "No Bidder yet"
                    : auctionState.highestBidder}
                </td>
              </tr>
              {data.account !== auctionState.seller ? (
                <tr>
                  <td className="p-2">Your Bid</td>
                  <td>
                    {Number(userBid) === 0
                      ? "You didn't bid on this auction"
                      : parseFloat(userBid).toFixed(5) + " ETH"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      </div>
    </>
  );
}

export default AuctionPage;
