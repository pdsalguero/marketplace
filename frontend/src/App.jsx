import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Header from "./components/Header";

// Páginas
import Home from "./pages/Home";
import Ads from "./pages/Ads";
import AdDetail from "./pages/AdDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Publicación
import Publish from "./pages/Publish";
import AutosWizard from "./pages/publish/autos/AutosWizard";
import GenericPublish from "./pages/publish/GenericPublish";

// Wizard de autos
import CategorySelect from "./pages/publish/autos/CategorySelect";
import LocationStep from "./pages/publish/autos/LocationStep";
import DetailsStep from "./pages/publish/autos/DetailsStep";
import PhotosStep from "./pages/publish/autos/PhotosStep";
import PriceStep from "./pages/publish/autos/PriceStep";
import ReviewStep from "./pages/publish/autos/ReviewStep";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-6">{children}</main>
    </div>
  );
}

// Alias /ad/:id → /ads/:id
function AdToAdsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/ads/${id}`} replace />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Home + listados */}
        <Route path="/" element={<Home />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/ads/:id" element={<AdDetail />} />
        {/* Alias para rutas antiguas */}
        <Route path="/ad/:id" element={<AdToAdsRedirect />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Publicación (genérica) */}
        <Route path="/publish" element={<Publish />} />
        <Route path="/publish/:slug" element={<GenericPublish />} />

        {/* Publicación → Autos (wizard) */}
        <Route path="/publish/autos" element={<AutosWizard />}>
          <Route index element={<CategorySelect />} />
          <Route path="ubicacion" element={<LocationStep />} />
          <Route path="detalles" element={<DetailsStep />} />
          <Route path="fotos" element={<PhotosStep />} />
          <Route path="precio" element={<PriceStep />} />
          <Route path="revision" element={<ReviewStep />} />
        </Route>

        {/* 404 */}
        <Route path="*"
          element={<div className="p-6">Página no encontrada</div>}
        />
      </Routes>
    </Layout>
  );
}
