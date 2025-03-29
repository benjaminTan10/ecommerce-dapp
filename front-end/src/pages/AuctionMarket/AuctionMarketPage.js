import "bootstrap/dist/css/bootstrap.css";
import React, { useEffect, useState } from "react";
import { ethers, utils } from "ethers";
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
import AuctionContract from "../../artifacts/contracts/AuctionMarket.json";
import contractsAddress from "../../artifacts/deployments/map.json";
import networks from "../../utils/networksMap.json";

const auctionContractAddress = contractsAddress["5777"]["AuctionMarket"][0];
const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const auctionStatusMap = { OPEN: 0, ENDED: 1 };

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function AuctionMarketPage() {
  const classes = useStyles();

  const data = useSelector((state) => state.blockchain.value);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [auctions, setAuctions] = useState([]);

  async function loadAuctions() {
    const signer = provider.getSigner();
    const market = new ethers.Contract(
      auctionContractAddress,
      AuctionContract.abi,
      signer
    );
    const allAuctions = await market.getAuctionsList();

    const openAuctions = allAuctions.filter(
      (p) => p[7] === auctionStatusMap["OPEN"]
    );
    if (openAuctions !== undefined) {
      const items = await Promise.all(
        openAuctions.map(async (auction) => {
          const metadataUrl = auction[2].replace("ipfs://", IPFS_GATEWAY);
          let metaData = await axios.get(metadataUrl);
          const imgUrl = metaData.data.image.replace("ipfs://", IPFS_GATEWAY);

          let item = {
            auctionId: Number(auction[0]),
            name: metaData.data.name,
            image: imgUrl,
            price: utils.formatUnits(auction[4].toString(), "ether"),
          };
          return item;
        })
      );
      setAuctions(items.reverse());
    }
  }

  function findAuction() {
    if (search !== "") {
      setLoading(true);
      const foundAuctions = auctions.filter((p) =>
        p.name.toLowerCase().includes(search)
      );
      setAuctions(foundAuctions);
      setLoading(false);
    }
  }

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  useEffect(() => {
    loadAuctions();
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
                    findAuction();
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
                  {auctions.map((auction, id) => {
                    return (
                      <Col style={{ marginBottom: "40px" }} md={3} key={id}>
                        <Card style={{ width: "16rem" }} key={id}>
                          <Card.Img
                            variant="top"
                            src={auction.image}
                            width="0px"
                            height="180px"
                          />
                          <Card.Body>
                            <Card.Title style={{ fontSize: "14px" }}>
                              {auction.name}
                            </Card.Title>
                            <Card.Text>
                              <Card.Text>
                                {parseFloat(auction.price).toFixed(3)} ETH
                              </Card.Text>
                            </Card.Text>
                            <a
                              className="btn btn-primary"
                              href={"/auctions/" + auction.auctionId}
                              role="button"
                            >
                              See More
                            </a>
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

export default AuctionMarketPage;
