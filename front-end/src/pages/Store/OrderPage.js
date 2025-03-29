import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.css";
import { Table, Form, Modal, Button } from "react-bootstrap";
import { ethers, utils } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import { CircularProgress } from "@material-ui/core";
import { useParams, useNavigate } from "react-router-dom";

import { IPFS_GATEWAY } from "./../../utils/ipfsStorage";
import StoreContract from "../../artifacts/contracts/Store.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const orderStatus = { 0: "PENDING", 1: "SENT", 2: "COMPLETED" };

function OrderPage() {
  const { store, product_id, order_id } = useParams();
  let navigate = useNavigate();
  const dispatch = useDispatch();

  const data = useSelector((state) => state.blockchain.value);

  const [formInput, setFormInput] = useState({ rating: "", review: "" });
  const [orderState, setOrderState] = useState({
    seller: "",
    name: "",
    description: "",
    image: "",
    total_buy_price: 0,
    buy_price_eth: 0,
    quantity: 0,
    has_quantity: true,
    has_been_reviewed: false,
    order_status: orderStatus[0],
  });

  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const updateBalance = async () => {
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };

  const orderDetails = async () => {
    if (Number(order_id) !== undefined) {
      const productStore = new ethers.Contract(
        store,
        StoreContract.abi,
        provider
      );
      const storeOwner = await productStore.callStatic.owner();

      const product_orders = await productStore.listStoreOrders();

      const order = product_orders.filter(
        (o) => Number(o[0]) === Number(order_id)
      )[0];

      const product_id = Number(order[1]);
      const product = await productStore.callStatic.storeProducts(product_id);

      const imgUrl = product[3].replace("ipfs://", IPFS_GATEWAY);

      if (order !== undefined) {
        setOrderState({
          ...orderState,
          seller: storeOwner,
          buyer: order[2],
          name: product[1],
          image: imgUrl,
          total_buy_price: utils.formatUnits(order[4]),
          buy_price_eth: utils.formatUnits(order[4]) / Number(order[3]),
          order_quantity: Number(order[3]),
          has_been_reviewed: order[5],
          order_status: orderStatus[order[6]],
        });
      }
    }
  };

  const fillOrder = async () => {
    try {
      if (Number(order_id) !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const productStore = new ethers.Contract(
          store,
          StoreContract.abi,
          signer
        );

        const fill_tx = await productStore.fillOrder(Number(order_id));
        await fill_tx.wait();

        setLoading(false);
        orderDetails(store, Number(order_id));
        updateBalance();
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  const confirm = async () => {
    try {
      if (Number(product_id) !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const productStore = new ethers.Contract(
          store,
          StoreContract.abi,
          signer
        );

        const confirm_tx = await productStore.confirmRecieved(Number(order_id));
        await confirm_tx.wait();

        setLoading(false);
        orderDetails(store, Number(order_id));
        updateBalance();
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  const cancel = async () => {
    try {
      if (Number(order_id) !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const productStore = new ethers.Contract(
          store,
          StoreContract.abi,
          signer
        );

        const cancel_tx = await productStore.cancelOrder(Number(order_id));
        await cancel_tx.wait();

        setLoading(false);
        orderDetails(store, Number(order_id));
        updateBalance();
        navigate("/my-products");
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  const review_product = async () => {
    try {
      if (order_id !== undefined && formInput.rating !== "") {
        setLoading(true);
        const signer = provider.getSigner();
        const productStore = new ethers.Contract(
          store,
          StoreContract.abi,
          signer
        );

        const review_tx = await productStore.leaveReview(
          Number(order_id),
          formInput.rating,
          formInput.review
        );
        await review_tx.wait();

        setLoading(false);
        setShow(false);
        setFormInput({ rating: "", review: "" });

        navigate("/store-product/" + store + "/" + product_id);
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
      setShow(false);
    }
  };

  useEffect(() => {
    orderDetails();
  }, [data.account, data.network, orderState.order_status]);

  return (
    <>
      <div className="row p-2">
        <div className="col-md-7 text-center p-3">
          <div className="p-3">
            <div>
              Order of <b id="itemname">{orderState.name}</b> for{" "}
              <b id="itemprice">
                {parseFloat(orderState.total_buy_price).toFixed(4)} ETH
              </b>
            </div>
            <br />
            <img
              className="rounded"
              src={orderState.image}
              height="350px"
              width="560px"
            />
            <br />
            <br />

            {data.account === orderState.seller ? (
              orderState.order_status === "PENDING" ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    fillOrder();
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Fill"
                  )}
                </Button>
              ) : orderState.order_status === "SENT" ? (
                <p>waiting for confirmation from buyer</p>
              ) : (
                <p>This order has been completed</p>
              )
            ) : orderState.order_status === "PENDING" ? (
              <>
                <p>This order has been sent to the seller</p>
                <Button
                  variant="primary"
                  onClick={() => {
                    cancel();
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Cancel"
                  )}
                </Button>
              </>
            ) : orderState.order_status === "SENT" ? (
              <Button
                variant="primary"
                onClick={() => {
                  confirm();
                }}
              >
                {loading ? (
                  <CircularProgress size={26} color="#fff" />
                ) : (
                  "Confirm"
                )}
              </Button>
            ) : (
              <p>This order has been completed</p>
            )}
          </div>
        </div>
        <div className="col-md-5 p-3">
          <h3 className="text-center p-2">Order Details</h3>
          <Table responsive>
            <tbody>
              <tr>
                <td className="p-2">Seller</td>
                <td>
                  {data.account === orderState.seller
                    ? "you are the seller"
                    : orderState.seller}
                </td>
              </tr>
              <tr>
                <td className="p-2">Buyer</td>
                <td>
                  {data.account === orderState.buyer
                    ? "You are the buyer"
                    : orderState.buyer}
                </td>
              </tr>
              <tr>
                <td className="p-2">Total Buy Price in ETH</td>
                <td>{parseFloat(orderState.total_buy_price).toFixed(5)}</td>
              </tr>
              {orderState.order_quantity !== 0 ? (
                <tr>
                  <td className="p-2">Quantity</td>
                  <td>{orderState.order_quantity}</td>
                </tr>
              ) : null}
              <tr>
                <td className="p-2">Order Status</td>
                <td>{orderState.order_status}</td>
              </tr>
            </tbody>
          </Table>

          {data.account === orderState.buyer ? (
            orderState.order_status === "COMPLETED" ? (
              !orderState.has_been_reviewed ? (
                <>
                  <Button variant="primary" onClick={handleShow}>
                    Review
                  </Button>

                  <Modal show={show} onHide={handleClose}>
                    <Modal.Header closeButton>
                      <Modal.Title>Leave A Review</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Rating:</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          placeholder="Rate product from 0-10"
                          required
                          onChange={(e) => {
                            setFormInput({
                              ...formInput,
                              rating: e.target.value,
                            });
                          }}
                        />
                      </Form.Group>

                      <br />
                      <div>
                        <label>Product Review: </label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          maxLength={150}
                          placeholder="Enter your review"
                          required
                          onChange={(e) => {
                            setFormInput({
                              ...formInput,
                              review: e.target.value,
                            });
                          }}
                        />
                      </div>
                      <br />
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="secondary" onClick={handleClose}>
                        Close
                      </Button>
                      <Button
                        variant="primary"
                        type="submit"
                        onClick={() => {
                          review_product();
                        }}
                      >
                        {loading ? (
                          <CircularProgress size={26} color="#fff" />
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </Modal.Footer>
                  </Modal>
                </>
              ) : null
            ) : null
          ) : null}
        </div>
      </div>
    </>
  );
}

export default OrderPage;
