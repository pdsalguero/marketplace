import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { ready, user, logout } = useContext(AuthContext);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between p-3 border-b">
      <Link to="/" className="font-semibold">Marketplace</Link>
      {!ready ? null : user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm">{user?.profile?.displayName || user?.email}</span>
          <button className="text-sm underline" onClick={onLogout}>Salir</button>
        </div>
      ) : (
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login">Login</Link>
          <Link to="/register">Registrarse</Link>
        </nav>
      )}
    </header>
  );
}
