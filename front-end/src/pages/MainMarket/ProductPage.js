import "bootstrap/dist/css/bootstrap.css";
import React, { useState, useEffect } from "react";
import { Table, Button } from "react-bootstrap";
import { ethers, utils } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import { CircularProgress } from "@material-ui/core";
import { useParams } from "react-router-dom";

import { IPFS_GATEWAY } from "./../../utils/ipfsStorage";
import MarketContract from "../../artifacts/contracts/Market.json";
import contractsAddress from "../../artifacts/deployments/map.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
const Marketaddress = contractsAddress["5777"]["Market"][0];

const statusMap = { 1: "IN SALE", 2: "PENDING", 3: "SENT", 4: "SOLD" };

function ProductPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const data = useSelector((state) => state.blockchain.value);

  const [productState, setProductState] = useState({
    seller: "",
    name: "",
    description: "",
    image: "",
    price: 0,
    price_eth: 0,
    buy_price_in_ETH: 0,
    buyer: "",
    status: "",
  });

  const [loading, setLoading] = useState(false);

  const updateBalance = async () => {
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };

  const productDetails = async (product_id) => {
    if (product_id !== undefined) {
      const market = new ethers.Contract(
        Marketaddress,
        MarketContract.abi,
        provider
      );
      const details = await market.callStatic.products(product_id);

      const imgUrl = details[4].replace("ipfs://", IPFS_GATEWAY);

      convertPrice(utils.formatUnits(details[5])).then((res) => {
        setProductState({
          ...productState,
          seller: details[1],
          name: details[2],
          description: details[3],
          image: imgUrl,
          price: utils.formatUnits(details[5]),
          price_eth: utils.formatUnits(res),
          buy_price_in_ETH: utils.formatUnits(details[6]),
          buyer: details[7],
          status: statusMap[details[8]],
        });
      });
    }
  };

  const purchase = async (product_id) => {
    try {
      if (product_id !== undefined) {
        setLoading(true);
        const price_in_eth = productState.price_eth;
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          Marketaddress,
          MarketContract.abi,
          signer
        );

        const purchase_tx = await market.purchase(product_id, {
          value: utils.parseEther(price_in_eth, "ether"),
        });
        await purchase_tx.wait();

        setLoading(false);
        productDetails(product_id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  const send = async (product_id) => {
    try {
      if (product_id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          Marketaddress,
          MarketContract.abi,
          signer
        );
        const send_tx = await market.sendProduct(product_id);
        await send_tx.wait();

        setLoading(false);
        productDetails(product_id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };
  const confirm = async (product_id) => {
    try {
      if (product_id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          Marketaddress,
          MarketContract.abi,
          signer
        );
        const confirm_tx = await market.confirmRecieved(product_id);
        await confirm_tx.wait();

        setLoading(false);
        productDetails(product_id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  const cancel = async (product_id) => {
    try {
      if (product_id !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const market = new ethers.Contract(
          Marketaddress,
          MarketContract.abi,
          signer
        );
        const cancel_tx = await market.cancelPurchase(product_id);
        await cancel_tx.wait();

        setLoading(false);
        productDetails(product_id);
        updateBalance();
      }
    } catch (err) {
      window.alert("An error has occured, Please try again");
      setLoading(false);
    }
  };

  async function convertPrice(amount) {
    const market = new ethers.Contract(
      Marketaddress,
      MarketContract.abi,
      provider
    );
    const price_in_eth = await market.callStatic._convertUSDToETH(
      utils.parseEther(amount, "ether")
    );
    return price_in_eth;
  }

  useEffect(() => {
    productDetails(Number(id));
  }, [data.account, data.network]);

  return (
    <>
      <div className="row p-2">
        <div className="col-md-7 text-center p-3">
          <div className="p-3">
            {Number(productState.buy_price_in_ETH) === 0 ? (
              <div>
                Sale of <b>{productState.name}</b> for{" "}
                <b>{parseFloat(productState.price_eth).toFixed(4)} ETH</b>
              </div>
            ) : (
              <div>
                <b>{productState.name}</b> bought for{" "}
                <b>
                  {parseFloat(productState.buy_price_in_ETH).toFixed(4)} ETH
                </b>
              </div>
            )}

            <div>{productState.description}</div>
            <br />
            <img
              className="rounded"
              src={productState.image}
              height="350px"
              width="560px"
            />
            <br />
            <br />
            {data.account === productState.seller ? (
              productState.status === "IN SALE" ? (
                <p>Your product is in sale</p>
              ) : productState.status === "PENDING" ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    send(id);
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "SEND"
                  )}
                </Button>
              ) : productState.status === "SENT" ? (
                <p>waiting for confirmation from buyer</p>
              ) : (
                <p>Your product has been sold</p>
              )
            ) : productState.status === "IN SALE" ? (
              <Button
                variant="primary"
                onClick={() => {
                  purchase(id);
                }}
              >
                {loading ? <CircularProgress size={26} color="#fff" /> : "Buy"}
              </Button>
            ) : productState.status === "PENDING" ? (
              <>
                <p>waiting for seller to send product</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    cancel(id);
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Cancel"
                  )}
                </Button>
              </>
            ) : productState.status === "SENT" ? (
              <Button
                variant="primary"
                onClick={() => {
                  confirm(id);
                }}
              >
                {loading ? (
                  <CircularProgress size={26} color="#fff" />
                ) : (
                  "Confirm"
                )}
              </Button>
            ) : (
              <p>Your have purchased this product</p>
            )}
          </div>
        </div>
        <div className="col-md-5 p-3">
          <h3 className="text-center p-2">Product Details</h3>
          <Table responsive>
            <tbody>
              <tr>
                <td className="p-2">Seller</td>
                <td>
                  {data.account === productState.seller
                    ? "you are the seller"
                    : productState.seller}
                </td>
              </tr>

              <tr>
                <td className="p-2">Product Status</td>
                <td>{productState.status}</td>
              </tr>

              <tr>
                <td className="p-2">Price in USD</td>
                <td>{productState.price} $</td>
              </tr>

              {Number(productState.buy_price_in_ETH) === 0 ? (
                <tr>
                  <td className="p-2">Price in ETH</td>
                  <td>{parseFloat(productState.price_eth).toFixed(5)}</td>
                </tr>
              ) : (
                <tr>
                  <td className="p-2">Buy Price</td>
                  <td>
                    {parseFloat(productState.buy_price_in_ETH).toFixed(5)} ETH
                  </td>
                </tr>
              )}
              <tr>
                <td className="p-2">Buyer</td>
                <td>
                  {data.account === productState.buyer
                    ? "You are the buyer"
                    : productState.buyer === ethers.constants.AddressZero
                    ? "No buyer yet"
                    : productState.buyer}
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>
    </>
  );
}

export default ProductPage;
