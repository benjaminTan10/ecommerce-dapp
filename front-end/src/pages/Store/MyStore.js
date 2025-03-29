import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { ethers, utils } from "ethers";
import { makeStyles, Tab, CircularProgress } from "@material-ui/core";
import {
  Card,
  Container,
  Row,
  Col,
  Table,
  Button,
  Modal,
  Form,
} from "react-bootstrap";
import { TabContext, TabList, TabPanel } from "@material-ui/lab";
import { useDispatch, useSelector } from "react-redux";
import { getUserData } from "../../features/market";
import { updateAccountData } from "../../features/blockchain";
import { File } from "web3.storage";
import { ipfsSaveContent } from "./../../utils/ipfsStorage";

import { IPFS_GATEWAY } from "./../../utils/ipfsStorage";
import StoreFactoryContract from "../../artifacts/contracts/StoreFactory.json";
import StoreContract from "../../artifacts/contracts/Store.json";
import contractsAddress from "../../artifacts/deployments/map.json";
import networks from "../../utils/networksMap.json";

const factoryAddress = contractsAddress["5777"]["StoreFactory"][0];

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const orderStatus = { 0: "PENDING", 1: "SENT", 2: "COMPLETED" };

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function MyStore() {
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);
  const userMarketItems = useSelector((state) => state.market.value);
  const dispatch = useDispatch();

  const [storeInSaleProducts, setstoreInSaleProducts] = useState([]);
  const [storeOrders, setstoreOrders] = useState([]);
  const [hasStore, setHasStore] = useState(false);

  const [currentTab, setCurrentTab] = useState("products");
  const [loading, setLoading] = useState(false);

  const [formInput, setFormInput] = useState({
    name: "",
    image: null,
    imageName: "",
  });

  const [show, setShow] = useState(false);
  const handleClose = () => {
    setShow(false);
    setFormInput({ name: "", image: null, imageName: "" });
  };
  const handleShow = () => setShow(true);

  const updateBalance = async () => {
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };

  const handleChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getImage = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    setFormInput({ ...formInput, imageName: file.name, image: file });
  };

  const getStore = async () => {
    setHasStore(false);

    const factory = new ethers.Contract(
      factoryAddress,
      StoreFactoryContract.abi,
      provider
    );

    const marketStores = await factory.getAllStores();

    const myStore = marketStores.filter(
      (storeInfo) => storeInfo[1] === data.account
    );

    if (myStore.length !== 0) {
      dispatch(
        getUserData({
          ...userMarketItems,
          store: myStore[0][0],
        })
      );
      setHasStore(true);
    }
  };

  const createStore = async () => {
    setLoading(true);
    const signer = provider.getSigner();
    const factory = new ethers.Contract(
      factoryAddress,
      StoreFactoryContract.abi,
      signer
    );

    if (!hasStore) {
      try {
        const fee = await factory.callStatic.createStoreFee();
        const create_store_fee = await factory.callStatic._convertUSDToETH(fee);

        const cid = await ipfsSaveContent(formInput.image);
        const imageURI = `ipfs://${cid}/${formInput.imageName}`;

        const data = JSON.stringify({
          name: formInput.name,
          image: imageURI,
        });

        const blob = new Blob([data], {
          type: "application/json",
        });

        const files = new File([blob], "store.json");

        const dataCid = await ipfsSaveContent(files);
        const descriptionURI = `ipfs://${dataCid}/store.json`;

        const create_store_tx = await factory.createStore(descriptionURI, {
          value: create_store_fee,
        });
        await create_store_tx.wait();

        setHasStore(true);
        setFormInput({ name: "", image: null, imageName: "" });
        getStore();
        setLoading(false);
      } catch (err) {
        setLoading(false);
        window.alert("An error has occured, Please try again");
      }
    }
  };

  async function remove(id) {
    const signer = provider.getSigner();
    const myStoreAddress = userMarketItems.store;
    const Store = new ethers.Contract(
      myStoreAddress,
      StoreContract.abi,
      signer
    );
    const remove_tx = await Store.removeProduct(Number(id));
    await remove_tx.wait();
    loadMyProducts();
  }
  async function loadMyProducts() {
    if (userMarketItems.store !== "") {
      const signer = provider.getSigner();
      const myStoreAddress = userMarketItems.store;
      const productStore = new ethers.Contract(
        myStoreAddress,
        StoreContract.abi,
        signer
      );

      const storeProducts = await productStore.listStoreProducts();

      const storeInSaleProducts = storeProducts.filter((p) => p[1] !== "");

      if (storeInSaleProducts !== undefined) {
        const items = storeInSaleProducts.map((p) => {
          const imgUrl = p[3].replace("ipfs://", IPFS_GATEWAY);
          let item = {
            productId: Number(p[0]),
            name: p[1],
            image: imgUrl,
            price: utils.formatUnits(p[4].toString(), "ether"),
            productOrdersCount: Number(p[6]),
          };
          return item;
        });
        setstoreInSaleProducts(items.reverse());
      }
    }
  }

  const loadMyOrders = async () => {
    if (userMarketItems.store !== "") {
      const signer = provider.getSigner();
      const myStoreAddress = userMarketItems.store;
      const productStore = new ethers.Contract(
        myStoreAddress,
        StoreContract.abi,
        signer
      );

      const orders = await productStore.listStoreOrders();
      const uncomplete_orders = orders.filter(
        (o) => orderStatus[o[6]] !== "COMPLETED"
      );

      if (uncomplete_orders !== undefined) {
        const items = await Promise.all(
          uncomplete_orders.map(async (order) => {
            const product_id = Number(order[1]);
            const product = await productStore.callStatic.storeProducts(
              product_id
            );

            let item = {
              orderId: Number(order[0]),
              productId: product_id,
              productName: product.name,
              buyer: order[2],
              quantity: Number(order[3]),
              TotalbuyPrice: utils.formatUnits(order[4], "ether"),
              status: orderStatus[order[6]],
            };
            return item;
          })
        );
        setstoreOrders(items.reverse());
      }
    }
  };

  const fillOrder = async (order_id) => {
    try {
      if (Number(order_id) !== undefined) {
        setLoading(true);
        const signer = provider.getSigner();
        const myStoreAddress = userMarketItems.store;
        const productStore = new ethers.Contract(
          myStoreAddress,
          StoreContract.abi,
          signer
        );

        const fill_tx = await productStore.fillOrder(Number(order_id));
        await fill_tx.wait();

        setLoading(false);
        loadMyOrders();
        updateBalance();
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getStore();
    loadMyProducts();
    loadMyOrders();
  }, [storeInSaleProducts.length, data.account]);

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  return (
    <>
      <div>
        {isConnected ? (
          isGoodNet ? (
            hasStore ? (
              <Container>
                <TabContext value={currentTab}>
                  <div className={classes.Container}>
                    <TabList onChange={handleChange}>
                      <Tab label="My Products" value="products" />
                      <Tab label="My Orders" value="orders" />
                    </TabList>
                  </div>

                  <TabPanel value="products">
                    <Container>
                      <div className={classes.Container}>
                        <p>
                          Add new product to your store
                          <a
                            className="btn btn-primary"
                            style={{ margin: "4px" }}
                            href={"/add-product/" + userMarketItems.store}
                            role="button"
                          >
                            Add Product
                          </a>
                        </p>
                      </div>
                      <Row className="mt-5">
                        {storeInSaleProducts.length !== 0
                          ? storeInSaleProducts.map((product, id) => {
                              return (
                                <Col
                                  md={3}
                                  style={{ marginBottom: "40px" }}
                                  key={id}
                                >
                                  <Card style={{ width: "16rem" }} key={id}>
                                    <Card.Img
                                      variant="top"
                                      src={product.image}
                                      width="0px"
                                      height="180px"
                                    />
                                    <Card.Body>
                                      <Card.Title style={{ fontSize: "14px" }}>
                                        {product.name}
                                      </Card.Title>
                                      <Card.Text>
                                        <Card.Text>{product.price} $</Card.Text>
                                      </Card.Text>
                                      <a
                                        className="btn btn-primary"
                                        style={{ margin: "4px" }}
                                        href={
                                          "/store-product/" +
                                          userMarketItems.store +
                                          "/" +
                                          product.productId
                                        }
                                        role="button"
                                      >
                                        See More
                                      </a>

                                      {product.productOrdersCount === 0 ? (
                                        <a
                                          className="btn btn-danger"
                                          role="button"
                                          onClick={() =>
                                            remove(product.productId)
                                          }
                                        >
                                          Remove
                                        </a>
                                      ) : null}
                                    </Card.Body>
                                  </Card>
                                </Col>
                              );
                            })
                          : null}
                      </Row>
                    </Container>
                  </TabPanel>
                  <TabPanel value="orders">
                    <Container>
                      {storeOrders.length !== 0 ? (
                        <Table hover>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>product</th>
                              <th>buyer</th>
                              <th>quantity</th>
                              <th>Total price ETH</th>
                              <th>status</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeOrders.map((order, index) => {
                              return (
                                <tr key={index}>
                                  <td>
                                    <a
                                      href={
                                        "/order/" +
                                        userMarketItems.store +
                                        "/" +
                                        order.productId +
                                        "/" +
                                        order.orderId
                                      }
                                    >
                                      {order.orderId}
                                    </a>
                                  </td>
                                  <td>{order.productName}</td>
                                  <td>{order.buyer}</td>
                                  {order.quantity !== 0 ? (
                                    <td>{order.quantity}</td>
                                  ) : (
                                    <td>/</td>
                                  )}
                                  <td>
                                    {parseFloat(order.TotalbuyPrice).toFixed(5)}
                                  </td>
                                  <td>{order.status}</td>

                                  {order.status === "PENDING" ? (
                                    <td key={index}>
                                      <Button
                                        variant="primary"
                                        onClick={() => {
                                          fillOrder(order.orderId);
                                        }}
                                      >
                                        {loading ? (
                                          <CircularProgress
                                            size={26}
                                            color="#fff"
                                          />
                                        ) : (
                                          "Fill"
                                        )}
                                      </Button>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      ) : (
                        <div className={classes.Container}>
                          All the orders are completed
                        </div>
                      )}
                    </Container>
                  </TabPanel>
                </TabContext>
              </Container>
            ) : (
              <div className={classes.Container}>
                You don't have a store, Create one
                <br />
                <Button variant="primary" onClick={handleShow}>
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Create"
                  )}
                </Button>
                <Modal show={show} onHide={handleClose}>
                  <Modal.Header closeButton>
                    <Modal.Title>Create Your Store</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Store name:</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter the store name"
                        required
                        onChange={(e) => {
                          setFormInput({ ...formInput, name: e.target.value });
                        }}
                      />
                    </Form.Group>

                    <br />
                    <Form.Group className="mb-3">
                      <Form.Label>Store image/brand: </Form.Label>
                      <Form.Control
                        type="file"
                        required
                        onChange={(e) => {
                          getImage(e);
                        }}
                      />
                    </Form.Group>
                    <br />
                    {formInput.image && (
                      <div className={classes.Container}>
                        <img
                          className="rounded-circle"
                          width="220"
                          height="200"
                          src={URL.createObjectURL(formInput.image)}
                        />
                      </div>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      Close
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      onClick={() => {
                        createStore();
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={26} color="#fff" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </Modal.Footer>
                </Modal>
              </div>
            )
          ) : (
            <div className={classes.Container}>
              You are on the wrong network switch to {currentNetwork} network
            </div>
          )
        ) : null}
      </div>
    </>
  );
}

export default MyStore;
