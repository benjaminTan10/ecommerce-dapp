import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers, utils } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import { Form, Button } from "react-bootstrap";
import { makeStyles, CircularProgress } from "@material-ui/core";

import { ipfsSaveContent } from "./../../utils/ipfsStorage";
import MarketContract from "../../artifacts/contracts/Market.json";
import contractsAddress from "../../artifacts/deployments/map.json";
import networks from "../../utils/networksMap.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
const Marketaddress = contractsAddress["5777"]["Market"][0];

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function AddProduct() {
  let navigate = useNavigate();
  const dispatch = useDispatch();

  const [image, setImage] = useState({
    name: "",
    file: null,
  });
  const [formInput, setFormInput] = useState({
    name: "",
    description: "",
    price: "",
  });

  const [loading, setLoading] = useState(false);

  const data = useSelector((state) => state.blockchain.value);

  const classes = useStyles();

  const updateBalance = async () => {
    const signer = await provider.getSigner();
    const balance = await signer.getBalance();
    dispatch(
      updateAccountData({ ...data, balance: utils.formatUnits(balance) })
    );
  };

  const getProductImage = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    setImage({
      name: file.name,
      file: file,
    });
  };

  const addProduct = async () => {
    if (image.file !== undefined) {
      try {
        setLoading(true);

        const signer = provider.getSigner();
        const market = new ethers.Contract(
          Marketaddress,
          MarketContract.abi,
          signer
        );

        const cid = await ipfsSaveContent(image.file);
        const imageURI = `ipfs://${cid}/${image.name}`;

        const add_tx = await market.addProduct(
          formInput.name,
          formInput.description,
          imageURI,
          utils.parseEther(formInput.price, "ether")
        );
        await add_tx.wait();

        setLoading(false);
        setImage({ name: "", file: null });
        setFormInput({ name: "", description: "", price: "" });

        navigate("/my-products");
        updateBalance();
      } catch (err) {
        console.log(err);
        setLoading(false);
      }
    } else {
      return;
    }
  };

  // ganache network is used for testing purposes
  const currentNetwork = networks["1337"];
  const isGoodNet = data.network === currentNetwork;
  const isConnected = data.account !== "";

  return (
    <>
      <div
        className="col-md-4 center"
        style={{ display: "inline-block", marginLeft: "35%" }}
      >
        {isConnected ? (
          isGoodNet ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Product name:</Form.Label>
                <Form.Control
                  type="text"
                  maxLength={30}
                  placeholder="Enter product name"
                  onChange={(e) => {
                    setFormInput({ ...formInput, name: e.target.value });
                  }}
                />
              </Form.Group>

              <br />
              <div>
                <label>Product Description: </label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  maxLength={200}
                  placeholder="Enter product description"
                  onChange={(e) => {
                    setFormInput({ ...formInput, description: e.target.value });
                  }}
                />
              </div>
              <br />
              <div>
                <label>Product price: </label>
                <Form.Control
                  type="text"
                  placeholder="Enter product price in $"
                  onChange={(e) =>
                    setFormInput({ ...formInput, price: e.target.value })
                  }
                />
              </div>
              <br />
              <div>
                <Form.Control
                  type="file"
                  name="file"
                  onChange={(e) => {
                    getProductImage(e);
                  }}
                />
                <br />
                {image.file && (
                  <div className={classes.Container}>
                    <img
                      className="rounded mt-4"
                      width="350"
                      src={URL.createObjectURL(image.file)}
                    />
                  </div>
                )}
              </div>
              <br />
              <div className={classes.Container}>
                <Button type="submit" variant="primary" onClick={addProduct}>
                  {loading ? (
                    <CircularProgress size={26} color="#fff" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
              <br />
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

export default AddProduct;
