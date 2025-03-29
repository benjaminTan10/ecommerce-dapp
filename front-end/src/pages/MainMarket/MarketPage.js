import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { ethers, utils } from "ethers";
import { makeStyles, CircularProgress } from "@material-ui/core";
import { useSelector } from "react-redux";
import {
  Card,
  Container,
  Row,
  Col,
  Form,
  FormControl,
  Button,
} from "react-bootstrap";

import { IPFS_GATEWAY } from "./../../utils/ipfsStorage";
import MarketContract from "../../artifacts/contracts/Market.json";
import StoreFactoryContract from "../../artifacts/contracts/StoreFactory.json";
import StoreContract from "../../artifacts/contracts/Store.json";
import contractsAddress from "../../artifacts/deployments/map.json";
import networks from "../../utils/networksMap.json";

const Marketaddress = contractsAddress["5777"]["Market"][0];
const factoryAddress = contractsAddress["5777"]["StoreFactory"][0];

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function MarketPage() {
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function loadProducts() {
    const signer = provider.getSigner();
    const market = new ethers.Contract(
      Marketaddress,
      MarketContract.abi,
      signer
    );
    const products = await market.getAllProducts();

    const inSaleProducts = products.filter((p) => p[8] === 1);

    const _marketProducts = inSaleProducts.map((p) => {
      const imgUrl = p[4].replace("ipfs://", IPFS_GATEWAY);
      let item = {
        productId: Number(p[0]),
        name: p[2],
        image: imgUrl,
        price: utils.formatUnits(p[5].toString(), "ether"),
        date: Number(p[9]),
      };
      return item;
    });

    const factory = new ethers.Contract(
      factoryAddress,
      StoreFactoryContract.abi,
      signer
    );
    const marketStores = await factory.getAllStores();

    let _allStoresProducts = [];
    await Promise.all(
      marketStores.map(async (store) => {
        const productStore = new ethers.Contract(
          store.storeAddress,
          StoreContract.abi,
          signer
        );
        const _storeProducts = await productStore.listStoreProducts();

        _storeProducts.map((p) => {
          const imgUrl = p[3].replace("ipfs://", IPFS_GATEWAY);
          let item = {
            store: store.storeAddress,
            productId: Number(p[0]),
            name: p[1],
            image: imgUrl,
            price: utils.formatUnits(p[4].toString(), "ether"),
            date: Number(p[8]),
          };
          _allStoresProducts.push(item);
        });
      })
    );

    const _allProducts = _marketProducts
      .concat(_allStoresProducts)
      .sort(function (a, b) {
        return b.date - a.date;
      });
    setAllProducts(_allProducts);
  }

  function findProduct() {
    if (search !== "") {
      setLoading(true);
      const foundProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(search)
      );
      setAllProducts(foundProducts);
      setLoading(false);
    }
  }

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  useEffect(() => {
    loadProducts();
  }, [search]);

  return (
    <>
      <div className={classes.Container}>
        {isConnected ? (
          isGoodNet ? (
            <>
              <Form className="d-flex">
                <FormControl
                  type="search"
                  placeholder="Search for a product"
                  className="me-2"
                  aria-label="Search"
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                />
                <Button
                  variant="outline-info"
                  onClick={() => {
                    findProduct();
                  }}
                >
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </Form>
              <Container>
                <Row className="mt-5">
                  {allProducts.map((product, id) => {
                    return (
                      <Col style={{ marginBottom: "40px" }} md={3} key={id}>
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
                            {product.store !== undefined ? (
                              <a
                                className="btn btn-primary"
                                href={
                                  "/store-product/" +
                                  product.store +
                                  "/" +
                                  product.productId
                                }
                                role="button"
                              >
                                See More
                              </a>
                            ) : (
                              <a
                                className="btn btn-primary"
                                href={"/products/" + product.productId}
                                role="button"
                              >
                                See More
                              </a>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Container>
            </>
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

export default MarketPage;
