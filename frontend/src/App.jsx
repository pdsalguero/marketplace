import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdsList from "./pages/AdsList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import AccountOverview from "./pages/AccountOverview";
import AccountProfile from "./pages/AccountProfile";
import AccountListings from "./pages/AccountListings";
import AccountPlaceholder from "./pages/AccountPlaceholder";
import ProtectedRoute from "./components/ProtectedRoute";
import AdCreate from "./pages/CreateAd";
import AdEdit from "./pages/AdEdit";
import Home from "./pages/Home"; // ⬅️ NUEVO

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Inicio ahora muestra el home estilo Yapo */}
          <Route path="/" element={<Home />} />

          {/* Listado público */}
          <Route path="/ads" element={<AdsList />} />

          {/* Crear / Editar (protegidas) */}
          <Route
            path="/ads/new"
            element={
              <ProtectedRoute>
                <AdCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ads/:id/edit"
            element={
              <ProtectedRoute>
                <AdEdit />
              </ProtectedRoute>
            }
          />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* /profile legacy */}
          <Route path="/profile" element={<Navigate to="/account/profile" replace />} />

          {/* Área privada /account */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          >
            <Route index element={<AccountOverview />} />
            <Route path="overview" element={<AccountOverview />} />
            <Route path="profile" element={<AccountProfile />} />
            <Route path="boost" element={<AccountPlaceholder title="Vende más rápido" />} />
            <Route path="interested" element={<AccountPlaceholder title="Interesados" />} />
            <Route path="saved" element={<AccountPlaceholder title="Búsquedas y favoritos" />} />
            <Route path="plans" element={<AccountPlaceholder title="Planes" />} />
            <Route path="listings" element={<AccountListings />} />
          </Route>
        </Routes>
      </main>
      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-gray-500">
          © {new Date().getFullYear()} Marketplace — Hecho con ❤️
        </div>
      </footer>
    </div>
  );
}
