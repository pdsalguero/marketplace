import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasToken, setHasToken] = useState(!!localStorage.getItem("token"));

  // Si el token cambia en otra pestaña, reflejar en UI
  useEffect(() => {
    const onStorage = () => setHasToken(!!localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setHasToken(false);
    // si estabas en una ruta protegida, te llevo a home
    if (location.pathname.startsWith("/publish")) {
      navigate("/");
    } else {
      // refrescar para que otros contextos (si los hay) recojan el cambio
      navigate(0);
    }
  };

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto p-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">Marketplace</Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/ads" className="hover:underline">Anuncios</Link>
          <Link to="/publish" className="hover:underline">Publicar</Link>

          <span className="mx-2 h-5 w-px bg-gray-300" />

          {hasToken ? (
            <>
              <Link to="/profile" className="hover:underline">Mi cuenta</Link>
              <button
                onClick={logout}
                className="border px-3 py-1 rounded hover:bg-gray-50"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="border px-3 py-1 rounded hover:bg-gray-50">
                Iniciar sesión
              </Link>
              <Link to="/register" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
