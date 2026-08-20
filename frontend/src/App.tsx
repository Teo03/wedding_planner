import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CategoryBrowse from "./pages/CategoryBrowse";
import VendorDetail from "./pages/VendorDetail";
import Vendors from "./pages/Vendors";
import Plan from "./pages/Plan";
import { useAuth } from "./context/AuthContext";
import { useI18n } from "./i18n";

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
          path="/vendors"
          element={
            <RequireAuth>
              <Vendors />
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
          path="/plan"
          element={
            <RequireAuth>
              <Plan />
            </RequireAuth>
          }
        />
        {/* The plan list used to live at /simulator; keep old links working. */}
        <Route path="/simulator" element={<Navigate to="/plan" replace />} />
      </Routes>
    </Layout>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();
  const { t } = useI18n();

  if (auth.loading) {
    return (
      <div className="py-16 text-center text-sm text-taupe-400">
        {t("auth.loadingAccount")}
      </div>
    );
  }

  if (!auth.user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
