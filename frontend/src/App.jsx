import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";

// Páginas
import Home from "./pages/Home";
import Ads from "./pages/Ads";
import AdDetail from "./pages/AdDetail";
import Login from "./pages/Login";

// Publicación
import Publish from "./pages/Publish";
import AutosWizard from "./pages/publish/autos/AutosWizard";
import GenericPublish from "./pages/publish/GenericPublish";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Home + listados */}
        <Route path="/" element={<Home />} />
        <Route path="/ads" element={<Ads />} />
        <Route path="/ads/:id" element={<AdDetail />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        {/* (opcional) <Route path="/register" element={<Register />} /> */}

        {/* Publicación */}
        <Route path="/publish" element={<Publish />} />
        <Route path="/publish/autos" element={<AutosWizard />} />
        <Route path="/publish/:slug" element={<GenericPublish />} />

        {/* 404 */}
        <Route path="*" element={<div className="p-6">Página no encontrada</div>} />
      </Routes>
    </Layout>
  );
}
