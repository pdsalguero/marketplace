import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdsList from "./pages/AdsList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import ProtectedRoute from "./components/ProtectedRoute";

const Placeholder = ({ title }) => (
  <div className="rounded-2xl border bg-white p-6 shadow-sm mt-6">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-gray-500">Pronto…</p>
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Navigate to="/ads" replace />} />
          <Route path="/ads" element={<AdsList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          >
            <Route path="boost" element={<Placeholder title="Vende más rápido" />} />
            <Route path="interested" element={<Placeholder title="Interesados" />} />
            <Route path="saved" element={<Placeholder title="Búsquedas y favoritos" />} />
            <Route path="plans" element={<Placeholder title="Planes" />} />
            <Route path="profile" element={<Placeholder title="Perfil" />} />
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
