import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AdsList from "./pages/AdsList";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Home redirige a anuncios */}
          <Route path="/" element={<Navigate to="/ads" replace />} />
          <Route path="/ads" element={<AdsList />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* futuras rutas */}
          {/* <Route path="/ads/new" element={<Publish />} /> */}
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
