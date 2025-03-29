import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
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
import StoreFactoryContract from "../../artifacts/contracts/StoreFactory.json";
import StoreContract from "../../artifacts/contracts/Store.json";
import contractsAddress from "../../artifacts/deployments/map.json";
import networks from "../../utils/networksMap.json";

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

function AllStores() {
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);
  const [allStores, setAllStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function loadStores() {
    const signer = provider.getSigner();

    const factory = new ethers.Contract(
      factoryAddress,
      StoreFactoryContract.abi,
      signer
    );
    const marketStores = await factory.getAllStores();

    if (marketStores !== undefined) {
      const allStores = await Promise.all(
        marketStores.map(async (store) => {
          const productStore = new ethers.Contract(
            store.storeAddress,
            StoreContract.abi,
            signer
          );
          const storeDetailsURL = await productStore.callStatic.storeMetaData();
          const metaUrl = storeDetailsURL.replace("ipfs://", IPFS_GATEWAY);
          const meta = await axios.get(metaUrl);
          const imgUrl = meta.data.image.replace("ipfs://", IPFS_GATEWAY);
          let item = {
            address: store.storeAddress,
            name: meta.data.name,
            image: imgUrl,
          };
          return item;
        })
      );
      setAllStores(allStores);
    }
  }

  function findProduct() {
    if (search !== "") {
      setLoading(true);
      const foundProducts = allStores.filter((s) =>
        s.name.toLowerCase().includes(search)
      );
      setAllStores(foundProducts);
      setLoading(false);
    }
  }

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  useEffect(() => {
    loadStores();
  }, []);

  return (
    <>
      <div className={classes.Container}>
        {isConnected ? (
          isGoodNet ? (
            <>
              <Form className="d-flex">
                <FormControl
                  type="search"
                  placeholder="Enter a store name"
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
                  {allStores.map((store, id) => {
                    return (
                      <Col style={{ marginBottom: "40px" }} md={3} key={id}>
                        <Card style={{ width: "16rem" }} key={id}>
                          <Card.Img
                            variant="top"
                            src={store.image}
                            width="0px"
                            height="180px"
                          />
                          <Card.Body>
                            <Card.Title
                              style={{ fontSize: "18px", textAlign: "center" }}
                            >
                              <a
                                style={{
                                  textDecoration: "none",
                                  color: "black",
                                }}
                                href={"/store/" + store.address}
                              >
                                {store.name}
                              </a>
                            </Card.Title>
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

export default AllStores;
