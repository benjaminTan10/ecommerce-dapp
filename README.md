<div id="top"></div>

<!-- ABOUT THE PROJECT -->
## Decentralized Marketplace Dapp V2

 
 <p align="center">
  <img alt="Dark" src="https://user-images.githubusercontent.com/83681204/161353432-f63bd35b-14f6-4f49-8b53-a19599272af8.png" width="100%">
</p>

This is my second implementation of a decentralized E-commerce marketplace built on top of EVM-compatible Blockchains such as Ethereum and Polygon. The previous dapp only allowed users to buy and sell single items without quantity. However, this new version is much more advanced and includes a wide range of features. Users can now create their own stores with customized branding and sell products with limited or unlimited quantities. Additionally, buyers have the ability to review the products they purchase. I have also introduced an Auction market, inspired by popular NFT marketplaces like OpenSea, however my implementation is more generalized and accepts a variety of products. It's important to note that all payments within the marketplace remain with cryptocurrency tokens.

<p align="center">
  <img alt="Dark" src="https://user-images.githubusercontent.com/83681204/161353476-c84cc1b8-dce9-4d02-afd6-e4b24d325528.png" width="100%">
</p>

### Built With

* [Solidity](https://docs.soliditylang.org/)
* [Brownie](https://eth-brownie.readthedocs.io)
* [React.js](https://reactjs.org/)
* [ethers.js](https://docs.ethers.io/v5/)
* [web3modal](https://github.com/Web3Modal/web3modal)
* [material ui](https://mui.com/getting-started/installation/)


<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#how-it-works">How it Works</a>
      <ul>
        <li><a href="#main-market">Main Market</a></li>
        <li><a href="#the-store">The Store</a></li>
        <li><a href="#auction-market">Auction Market</a></li>
      </ul>
    </li>
    <li>
      <a href="#how-to-use">How to Use</a>
      <ul>
        <li><a href="#scripts">Scripts</a></li>
        <li><a href="#testing">Testing</a></li>
        <li><a href="#front-end">Front End</a></li>
      </ul>
    </li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>


<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

Please install or have installed the following:
* [nodejs and npm](https://nodejs.org/en/download/) 
* [python](https://www.python.org/downloads/)
* [MetaMask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn) Chrome extension installed in your browser

### Installation

1. Installing Brownie: Brownie is a python framework for smart contracts development,testing and deployments. It's quit like [HardHat](https://hardhat.org) but it uses python for writing test and deployements scripts instead of javascript.
   Here is a simple way to install brownie.
   ```
    pip install --user pipx
    pipx ensurepath
    # restart your terminal
    pipx install eth-brownie
   ```
   Or if you can't get pipx to work, via pip (it's recommended to use pipx)
    ```
    pip install eth-brownie
    ```
   Install [ganache-cli](https://www.npmjs.com/package/ganache-cli): 
   ```sh
    npm install -g ganache-cli
    ```
   
3. Clone the repo:
   ```sh
   git clone https://github.com/kaymen99/MarketPlace-Dapp-V2.git
   cd MarketPlace-Dapp-V2
   ```
3. Install Ganache:
   Ganache is a local blockchain that run on your machine, it's used during development stages because it allows quick smart contract testing and avoids all real Testnets problems. 
   You can install ganache from this link : https://trufflesuite.com/ganache/
   
   Next, you need to setup the ganache network with brownie :
   ```sh
   brownie networks add Ethereum ganache-local host=http://127.0.0.1:7545 chainid=5777
   ```
4. Set your environment variables
   To be able to deploy to real testnets you need to add your PRIVATE_KEY (You can find your PRIVATE_KEY from your ethereum wallet like metamask) and the infura project Id (just create an infura account it's free) to the .env file:
   ```
   PRIVATE_KEY=<PRIVATE_KEY>
   WEB3_INFURA_PROJECT_ID=<< YOUR INFURA PROJECT ID >>
   ```
   You can choose to use ethereum testnets like rinkeby, Kovan or any other evm compatible testnet.
   You'll also need some eth in the testnet. You can get it into your wallet by using a public faucet. 

5. As infura recently removed its free IPFS gateway i used `web3.storage` api for storing data into IPFS, this api is as simple as infura it requires the creation of a free account and a new api token which you can do [here](https://web3.storage), when you finish add your api token into the `src/utils/ipfsStorage.js` file:
   ```js
    const web3storage_key = "YOUR-WEB3.STORAGE-API-TOKEN";
   ```
   
<p align="right">(<a href="#top">back to top</a>)</p>


<!-- Working EXAMPLES -->
## How it Works

### Main Market

This is the core of the old version [marketplace V1](https://github.com/Aymen1001/MarketPlace-dapp) and it's made for single items purchase , User can add a product by providing the product name, description, price in $ and image.

![Capture d’écran 2022-03-03 à 22 36 53](https://user-images.githubusercontent.com/83681204/156660595-9432f950-941d-465f-ad69-bb0edaad32b7.png)

The platform ensures a good interaction between the seller and the buyer by deviding the purchase process (product state) into 4 steps:
  <ul>
    <li><b>In Sale:</b> The first step when a seller list it's product on the market </li>
    <li><b>Pending:</b> When a product is bought the amount paid is locked in the smart contract and buyer waits for seller to sent the product </li>
    <li><b>Sent:</b> The seller sends the product and waits for the buyer confirmation</li>
    <li><b>Sold:</b> The buyer confirms the recieval and the funds are transfered to the seller </li> 
  </ul>
 
All this steps can be performed on the product page: 


<table>
  <tr>
     <td style="text-align:center;">Seller Point of view </td>
     <td style="text-align:center;">Buyer Point of view </td>
  </tr>
  <tr>
    <td valign="top"><img src="https://user-images.githubusercontent.com/83681204/156660145-aacb1ff4-2ba3-44d5-8bb9-87c927571b6b.png"></td>
    <td valign="top"><img src="https://user-images.githubusercontent.com/83681204/156660202-5bbb40db-ccf6-4a9f-88eb-3b407eca0211.png"></td>
  </tr>
 </table>


### The Store

The dapp enables sellers to create their own order based stores, They can add limited and unlimited quantity products. 

Store Page:

<img src="https://user-images.githubusercontent.com/83681204/161355217-4bebbe79-9a28-454d-8249-6db70213ce22.png">

<br/>

Seller Dashboard:

<img src="https://user-images.githubusercontent.com/83681204/161355756-faf21a74-6a5e-4cb3-af3e-01400bd273ff.png">


Each seller willing to create a new store must provide a name and the store logo:

<p align="center">
  <img alt="Dark" src="https://user-images.githubusercontent.com/83681204/161355090-cced48d8-d6f0-444e-a3c1-af8f62c9d698.png" width="100%">
</p>

On the product page you can find all details regarding the product(seller, quantity, price,...) and the reviews posted by previous buyers,
When an order is created it goes through 3 main states: 
<ul>
  <li><b>PENDING:</b> just created and waiting for seller acceptance</li>
  <li><b>SENT:</b> product sent and waiting for buyer recieval confirmation</li>
  <li><b>COMPLETED:</b> The order is complete so seller recieve payment and buyer can leave a review </li>    
</ul>

![store-product-page](https://user-images.githubusercontent.com/83681204/161357125-2a1cb716-be24-4382-8708-23d930afc983.png)

### Auction Market

User can start an auction for any type of products by providing name, description, starting price, auction duration (in hours), item image.
Bidders can offer an initial bid and outbid if necessary without having to withdraw their fund on each bid, the highest bidder will be determined after the end of the auction clock

<table>
  <tr>
    <td valign="top"><img src="https://user-images.githubusercontent.com/83681204/161357638-e10c63c8-3f10-44ad-a8a3-34d492a6d2c0.png"></td>
    <td valign="top"><img src="https://user-images.githubusercontent.com/83681204/161357676-ebe2be3c-9922-4d1d-9d18-6e4291536d0f.png"></td>
  </tr>
 </table>

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- USAGE EXAMPLES -->
## How to Use

    
### Scripts

   In the MarketPlace-Dapp-V2 folder you'll find a directory scripts, it contain all the python code for deploying your contracts and also some useful functions

   The reset.py file is used to remove all previous contracts deployments from build directory:
   ```sh
   brownie run scripts/reset.py
   ```
   The deploy.py file allow the deployment to the testnet/local-network:
   ```sh
   brownie run scripts/deploy.py --network=ganache-local
   ```
   The update_front_end.py is used to transfer all the smart contracts data (abi,...) and addresses to the front end in the artifacts directory:
   ```sh
   brownie run scripts/update_front_end.py
   ```
   
   After running this 3 cammands, the MarketPlace contract is now deployed and is integrated with the front end
   
 <p align="right">(<a href="#top">back to top</a>)</p>
  
 ### Testing

   In the MarketPlace-Dapp-V2  folder you'll find a directory tests, it contain all the python code used for testing the smart contract functionalities
   
   You can run all the tests by :
   ```sh
   brownie test
   ```
   Or you can test each function individualy:
   ```sh
   brownie test -k <function name>
   ```
   
<p align="right">(<a href="#top">back to top</a>)</p>
   
### Front-end
   
   The user interface of this application is build using React JS, it can be started by running: 
   ```sh
   cd front-end
   yarn
   yarn start
   ```
   It uses the following libraries:
      <ul>
        <li><b>Ethers.js:</b> used as interface between the UI and the deployed smart contract</li>
        <li><b>Web3modal:</b> for conecting to Metamask</li>
        <li><b>ipfs-http-client:</b> for connecting  and uploading files to IPFS </li>
        <li><b>@reduxjs/toolkit & redux-persist:</b> for managing the app states (account, balance, blockchain) </li>
        <li><b>Material UI:</b> used for react components and styles </li>    
      </ul>

   
<p align="right">(<a href="#top">back to top</a>)</p>


<!-- Contact -->
## Contact

If you have any question or problem running this project just contact me: aymenMir1001@gmail.com

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>

