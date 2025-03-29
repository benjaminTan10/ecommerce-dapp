import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ethers, utils } from "ethers";
import { useDispatch, useSelector } from "react-redux";
import { updateAccountData } from "../../features/blockchain";
import { Form, Button } from "react-bootstrap";

import { makeStyles, CircularProgress } from "@material-ui/core";

import { ipfsSaveContent } from "./../../utils/ipfsStorage";
import StoreContract from "../../artifacts/contracts/Store.json";
import networks from "../../utils/networksMap.json";

const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

const useStyles = makeStyles((theme) => ({
  Container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(2),
  },
}));

function AddProduct() {
  const { store } = useParams();

  let navigate = useNavigate();
  const dispatch = useDispatch();

  const [image, setImage] = useState({
    name: "",
    file: null,
  });
  const [formInput, setFormInput] = useState({
    name: "",
    description: "",
    price: 0,
    quantity: 0,
    type: 1,
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

  // read uploaded file using FileReader and buffer
  const getProductImage = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    setImage({
      name: file.name,
      file: file,
    });
  };

  const addProduct = async () => {
    if (image !== undefined) {
      try {
        setLoading(true);

        const signer = provider.getSigner();
        const my_store = new ethers.Contract(store, StoreContract.abi, signer);

        const cid = await ipfsSaveContent(image.file);
        const imageURI = `ipfs://${cid}/${image.name}`;

        const add_tx = await my_store.addProduct(
          formInput.name,
          formInput.description,
          imageURI,
          utils.parseEther(String(formInput.price), "ether"),
          formInput.quantity,
          formInput.type
        );
        await add_tx.wait();

        setLoading(false);
        setImage({ name: "", file: null });
        setFormInput({
          name: "",
          description: "",
          price: 0,
          quantity: 0,
          type: 0,
        });

        navigate("/my-store");
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
                  required
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
                  required
                />
              </div>
              <br />
              <div>
                <label>Product price: </label>
                <Form.Control
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Enter product price in $"
                  onChange={(e) =>
                    setFormInput({ ...formInput, price: e.target.value })
                  }
                  required
                />
              </div>
              <br />
              <div>
                <label>Product Quantity: </label>
                <div key={`inline-radio`} className="mb-3">
                  <Form.Check
                    inline
                    label="Fixed"
                    name="group1"
                    type="radio"
                    value={0}
                    id={`inline-radio-1`}
                    onClick={(e) =>
                      setFormInput({
                        ...formInput,
                        type: Number(e.target.value),
                      })
                    }
                    required
                  />
                  <Form.Check
                    inline
                    label="Unlimited"
                    name="group1"
                    type="radio"
                    value={1}
                    id={`inline-radio-2`}
                    onClick={(e) =>
                      setFormInput({
                        ...formInput,
                        type: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              {formInput.type === 0 ? (
                <div>
                  <Form.Control
                    type="number"
                    min="1"
                    placeholder="Enter product quantity"
                    onChange={(e) =>
                      setFormInput({ ...formInput, quantity: e.target.value })
                    }
                    required
                  />
                </div>
              ) : null}
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
