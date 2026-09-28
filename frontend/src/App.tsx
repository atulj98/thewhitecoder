import { Route, Routes } from "react-router-dom";
import { Link } from "react-router-dom";
import Layout from "./components/Layout";
import CatalogPage from "./pages/CatalogPage";
import SheetPage from "./pages/SheetPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="/sheets/:slug" element={<SheetPage />} />
        <Route
          path="*"
          element={
            <div className="container not-found">
              <h1>Page not found.</h1>
              <Link to="/">Back to study sheets</Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
