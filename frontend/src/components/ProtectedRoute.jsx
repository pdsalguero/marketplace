import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    // 👈 si no hay sesión, redirige a login
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
