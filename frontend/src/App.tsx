import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CategoryBrowse from "./pages/CategoryBrowse";
import VendorDetail from "./pages/VendorDetail";
import Simulator from "./pages/Simulator";
import { useAuth } from "./context/AuthContext";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/category/:slug"
          element={
            <RequireAuth>
              <CategoryBrowse />
            </RequireAuth>
          }
        />
        <Route
          path="/vendors/:slug"
          element={
            <RequireAuth>
              <VendorDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/simulator"
          element={
            <RequireAuth>
              <Simulator />
            </RequireAuth>
          }
        />
      </Routes>
    </Layout>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="py-16 text-center text-sm text-stone-500">
        Loading account...
      </div>
    );
  }

  if (!auth.user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
