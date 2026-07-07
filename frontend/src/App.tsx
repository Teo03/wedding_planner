import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CategoryBrowse from "./pages/CategoryBrowse";
import VendorDetail from "./pages/VendorDetail";
import Simulator from "./pages/Simulator";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:slug" element={<CategoryBrowse />} />
        <Route path="/vendors/:slug" element={<VendorDetail />} />
        <Route path="/simulator" element={<Simulator />} />
      </Routes>
    </Layout>
  );
}
