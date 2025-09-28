import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { ready, token } = useAuth();
  if (!ready) return null;               // o spinner
  return token ? children : <Navigate to="/login" replace />;
}
