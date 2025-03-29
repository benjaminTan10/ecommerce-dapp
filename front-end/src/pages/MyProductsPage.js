import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { ethers, utils } from "ethers";
import { makeStyles, Tab } from "@material-ui/core";
import { Card, Container, Row, Col } from "react-bootstrap";
import { TabContext, TabList, TabPanel } from "@material-ui/lab";
import { useSelector } from "react-redux";

import { IPFS_GATEWAY } from "../utils/ipfsStorage";
import MarketContract from "../artifacts/contracts/Market.json";
import StoreFactoryContract from "../artifacts/contracts/StoreFactory.json";
import StoreContract from "../artifacts/contracts/Store.json";
import contractsAddress from "../artifacts/deployments/map.json";
import networks from "../utils/networksMap.json";

const Marketaddress = contractsAddress["5777"]["Market"][0];
const factoryAddress = contractsAddress["5777"]["StoreFactory"][0];

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const productStatus = { 1: "IN SALE", 2: "PENDING", 3: "SENT", 4: "SOLD" };
const orderStatus = { 0: "PENDING", 1: "SENT", 2: "COMPLETED" };

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function MyProductsPage() {
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);
  const [saleProducts, setSaleProducts] = useState([]);
  const [buyProducts, setBuyProducts] = useState([]);
  const [allMyOrders, setAllMyOrders] = useState([]);

  const [currentTab, setCurrentTab] = useState("sell");

  const handleChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  async function remove(id) {
    const signer = provider.getSigner();
    const market = new ethers.Contract(
      Marketaddress,
      MarketContract.abi,
      signer
    );
    const remove_tx = await market.remove(Number(id));
    await remove_tx.wait();
    loadMyProducts();
  }

  async function loadMyOrders() {
    const signer = provider.getSigner();
    const factory = new ethers.Contract(
      factoryAddress,
      StoreFactoryContract.abi,
      signer
    );
    const allStores = await factory.getAllStores();

    let _allMyOrders = [];
    await Promise.all(
      allStores.map(async (store) => {
        const productStore = new ethers.Contract(
          store.storeAddress,
          StoreContract.abi,
          signer
        );
        const orders = await productStore.listStoreOrders();
        const my_orders = orders.filter((o) => o[2] === data.account);

        await Promise.all(
          my_orders.map(async (order) => {
            const product = await productStore.callStatic.storeProducts(
              Number(order[1])
            );
            const imgUrl = product[3].replace("ipfs://", IPFS_GATEWAY);
            let item = {
              store: store.storeAddress,
              orderId: Number(order[0]),
              productId: Number(order[1]),
              name: product[1],
              image: imgUrl,
              price: utils.formatUnits(order[4].toString(), "ether"),
              order_status: orderStatus[order[6]],
            };
            _allMyOrders.push(item);
          })
        );
      })
    );
    setAllMyOrders(_allMyOrders);
    console.log(_allMyOrders);
  }
  async function loadMyProducts() {
    const signer = provider.getSigner();
    const market = new ethers.Contract(
      Marketaddress,
      MarketContract.abi,
      signer
    );

    const allProducts = await market.getAllProducts();

    const mySaleProducts = allProducts.filter((p) => p[1] === data.account);
    const myBoughtProducts = allProducts.filter((p) => p[7] === data.account);

    if (mySaleProducts !== undefined) {
      const items = mySaleProducts.map((p) => {
        const imgUrl = p[4].replace("ipfs://", IPFS_GATEWAY);
        let item = {
          productId: Number(p[0]),
          name: p[2],
          image: imgUrl,
          price: utils.formatUnits(p[5].toString(), "ether"),
          status: productStatus[p[8]],
        };
        return item;
      });
      setSaleProducts(items.reverse());
    }
    if (myBoughtProducts !== undefined) {
      const items = myBoughtProducts.map((p) => {
        const imgUrl = p[4].replace("ipfs://", IPFS_GATEWAY);
        let item = {
          productId: Number(p[0]),
          name: p[2],
          image: imgUrl,
          price: utils.formatUnits(p[5].toString(), "ether"),
          status: p[8],
        };
        return item;
      });
      setBuyProducts(items.reverse());
    }
  }

  useEffect(() => {
    loadMyProducts();
    loadMyOrders();
  }, [saleProducts.length, data.account]);

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  return (
    <>
      <div>
        {isConnected ? (
          isGoodNet ? (
            <Container>
              <TabContext value={currentTab}>
                <div className={classes.Container}>
                  <TabList onChange={handleChange}>
                    <Tab label="My Sales" value="sell" />
                    <Tab label="My Buyings" value="buy" />
                  </TabList>
                </div>
                <TabPanel value="sell">
                  <Container>
                    <Row className="mt-5">
                      {saleProducts.length !== 0 ? (
                        saleProducts.map((product, id) => {
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
                                    href={"/products/" + product.productId}
                                    role="button"
                                  >
                                    See More
                                  </a>
                                  {product.status === "IN SALE" ? (
                                    <a
                                      className="btn btn-danger"
                                      role="button"
                                      onClick={() => remove(product.productId)}
                                    >
                                      Remove
                                    </a>
                                  ) : product.status === "SOLD" ? (
                                    <a className="btn btn-success">Sold</a>
                                  ) : null}
                                </Card.Body>
                              </Card>
                            </Col>
                          );
                        })
                      ) : (
                        <div className={classes.Container}>
                          <p>You didn't list any product for sale </p>
                        </div>
                      )}
                    </Row>
                  </Container>
                </TabPanel>
                <TabPanel value="buy">
                  <Container>
                    <h3 className="text-center p-1">Products</h3>
                    <Row className="mt-5">
                      {buyProducts.length !== 0 ? (
                        buyProducts.map((product, id) => {
                          return (
                            <Col md={3} style={{ margin: "20px" }} key={id}>
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
                                    href={"/products/" + product.productId}
                                    role="button"
                                  >
                                    See More
                                  </a>
                                </Card.Body>
                              </Card>
                            </Col>
                          );
                        })
                      ) : (
                        <div className={classes.Container}>
                          <p>You didn't buy any product yet</p>
                        </div>
                      )}
                    </Row>
                    <h3 className="text-center p-2">Orders</h3>
                    <Row className="mt-5">
                      {allMyOrders.length !== 0 ? (
                        allMyOrders.map((order, id) => {
                          return (
                            <Col md={3} style={{ margin: "20px" }} key={id}>
                              <Card style={{ width: "16rem" }} key={id}>
                                <Card.Img
                                  variant="top"
                                  src={order.image}
                                  width="0px"
                                  height="180px"
                                />
                                <Card.Body>
                                  <Card.Title style={{ fontSize: "14px" }}>
                                    {order.name}
                                  </Card.Title>
                                  <Card.Text>
                                    {parseFloat(order.price).toFixed(3)} ETH
                                    <p>Status: {order.order_status}</p>
                                  </Card.Text>
                                  <div style={{ display: "inline" }}>
                                    <a
                                      className="btn btn-primary"
                                      style={{ margin: "4px" }}
                                      href={
                                        "/order/" +
                                        order.store +
                                        "/" +
                                        order.productId +
                                        "/" +
                                        order.orderId
                                      }
                                      role="button"
                                    >
                                      See More
                                    </a>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          );
                        })
                      ) : (
                        <div className={classes.Container}>
                          <p>You don't have any order yet</p>
                        </div>
                      )}
                    </Row>
                  </Container>
                </TabPanel>
              </TabContext>
            </Container>
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

export default MyProductsPage;
