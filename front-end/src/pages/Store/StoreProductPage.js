import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.css";
import { Table, Form, Button } from "react-bootstrap";
import { ethers, utils } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import {
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
} from "@material-ui/core";
import { useParams } from "react-router-dom";
import Identicon from "../../components/Identicon";

import { IPFS_GATEWAY } from "./../../utils/ipfsStorage";
import StoreContract from "../../artifacts/contracts/Store.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
const quantityMap = { 0: true, 1: false };

const useStyles = makeStyles((theme) => ({
  Container: {
    padding: theme.spacing(4),
    display: "flex",
    textAlign: "center",
    gap: theme.spacing(1),
  },
  box: {
    position: "center",
    padding: theme.spacing(2),
    marginLeft: "20%",
  },
}));

function StoreProductPage() {
  const { store, id } = useParams();
  const dispatch = useDispatch();
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);

  const [productReviews, setProductReviews] = useState([]);
  const [buyQuantity, setBuyQuantity] = useState(1);

  const [productState, setProductState] = useState({
    seller: "",
    name: "",
    description: "",
    image: "",
    price: 0,
    price_eth: 0,
    quantity: 0,
    numberOrders: 0,
    has_quantity: true,
  });

  const [loading, setLoading] = useState(false);

  const updateBalance = async () => {
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };

  const productDetails = async (store, product_id) => {
    if (product_id !== undefined) {
      const productStore = new ethers.Contract(
        store,
        StoreContract.abi,
        provider
      );
      const storeOwner = await productStore.callStatic.owner();
      const details = await productStore.callStatic.storeProducts(product_id);

      const imgUrl = details[3].replace("ipfs://", IPFS_GATEWAY);

      convertPrice(utils.formatUnits(details[4])).then((res) => {
        setProductState({
          ...productState,
          seller: storeOwner,
          name: details[1],
          description: details[2],
          image: imgUrl,
          price: utils.formatUnits(details[4]),
          price_eth: utils.formatUnits(res),
          quantity: Number(details[5]),
          numberOrders: Number(details[6]),
          has_quantity: quantityMap[details[7]],
        });
      });
    }
  };

  const getProductReviews = async (product_id) => {
    try {
      if (product_id !== undefined) {
        const productStore = new ethers.Contract(
          store,
          StoreContract.abi,
          provider
        );

        const reviews = await productStore.listProductReviews(product_id);
        const items = reviews.map((r) => {
          let item = {
            buyer: r[0],
            rating: r[1],
            review: r[2],
          };
          return item;
        });
        setProductReviews(items.reverse());
      }
    } catch (err) {
      console.log(err);
    }
  };

  const purchase = async (id) => {
    try {
      if (Number(id) !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const productStore = new ethers.Contract(
          store,
          StoreContract.abi,
          signer
        );

        const order_total_price = await convertPrice(
          Number(productState.price) * Number(buyQuantity)
        );

        const buy_tx = await productStore.createBuyOrder(
          Number(id),
          Number(buyQuantity),
          { value: order_total_price }
        );
        await buy_tx.wait();

        setLoading(false);
        productDetails(store, Number(id));
        updateBalance();
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  async function convertPrice(amount) {
    const productStore = new ethers.Contract(
      store,
      StoreContract.abi,
      provider
    );
    const price_in_eth = await productStore.callStatic._convertUSDToETH(
      utils.parseEther(amount.toString(), "ether")
    );
    return price_in_eth;
  }

  useEffect(() => {
    productDetails(store, Number(id));
    getProductReviews(Number(id));
  }, [data.account, data.network]);

  return (
    <>
      <div className="row p-2">
        <div className="col-md-7 text-center p-3">
          <div className="p-3">
            <div>
              Sale of <b id="itemname">{productState.name}</b> for{" "}
              <b id="itemprice">
                {parseFloat(productState.price_eth).toFixed(4)} ETH
              </b>
            </div>
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
              <p>Your product is in sale</p>
            ) : productState.has_quantity ? (
              <>
                <div className="col-md-3" style={{ marginLeft: "35%" }}>
                  <Form.Control
                    type="number"
                    min="1"
                    max={productState.quantity}
                    placeholder={buyQuantity}
                    onChange={(e) => {
                      setBuyQuantity(e.target.value);
                    }}
                  />
                  <br />
                  <Button
                    variant="primary"
                    onClick={() => {
                      purchase(id);
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={26} color="#fff" />
                    ) : (
                      "Buy"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  purchase(id);
                }}
              >
                {loading ? <CircularProgress size={26} color="#fff" /> : "Buy"}
              </Button>
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
              {productState.has_quantity ? (
                <tr>
                  <td className="p-2">Quantity</td>
                  <td>{productState.quantity}</td>
                </tr>
              ) : null}
              <tr>
                <td className="p-2">Price in USD</td>
                <td>{productState.price} $</td>
              </tr>
              <tr>
                <td className="p-2">Price in ETH</td>
                <td>{parseFloat(productState.price_eth).toFixed(5)}</td>
              </tr>
              <tr>
                <td className="p-2">Orders</td>
                <td>{productState.numberOrders}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>
      {productReviews.length !== 0 ? (
        <div className="row p-2">
          <div className="col-md-12 text-center p-3">
            <h3 className="text-center p-2">Product Reviews</h3>
            <div className={classes.box}>
              <List>
                {productReviews.map((r, i) => {
                  return (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <Identicon account={r.buyer} />
                      </ListItemIcon>
                      <ListItemText
                        primary={r.rating + "/10"}
                        secondary={r.review}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default StoreProductPage;
