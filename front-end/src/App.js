import './App.css';
import Main from "./components/Main"
import { Home, MarketPage, AuctionMarketPage, CreateAuction, AuctionPage, MyProductsPage, ProductPage, AddProduct, AddStoreProduct, AllStores, MyStore, StoreProductPage, OrderPage, StorePage } from './pages'
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {

  return (
    <div>
      <Router>
        <Main />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/main-market" element={<MarketPage />} />
          <Route path="/auction-market" element={<AuctionMarketPage />} />
          <Route path="/my-products" element={<MyProductsPage />} />
          <Route path="/my-store" element={<MyStore />} />
          <Route path="/create-auction" element={<CreateAuction />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/add-product/:store" element={<AddStoreProduct />} />
          <Route path="/auctions/:id" element={<AuctionPage />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/all-stores" element={<AllStores />} />
          <Route path="/store/:address" element={<StorePage />} />
          <Route path="/store-product/:store/:id" element={<StoreProductPage />} />
          <Route path="/order/:store/:product_id/:order_id" element={<OrderPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
