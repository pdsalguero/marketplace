import { Link, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { ready, user, logout } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  // Logs
  useEffect(() => { console.log("[Navbar] mount"); return () => console.log("[Navbar] unmount"); }, []);
  useEffect(() => { console.log("[Navbar] ready:", ready); }, [ready]);
  useEffect(() => {
    console.log("[Navbar] user:", user);
    if (user) {
      console.log("[Navbar] displayName:", user?.profile?.displayName);
      console.log("[Navbar] email:", user?.email);
    }
  }, [user]);

  const handleLogout = () => {
    console.log("[Navbar] logout clicked");
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link to="/" className="font-bold text-xl hover:text-gray-300">Marketplace</Link>
          </div>

          <div className="hidden md:flex md:space-x-6">
            <Link to="/ads" className="hover:text-gray-300">Anuncios</Link>
            {ready && user && (
              <>
                <Link to="/ads/new" className="hover:text-gray-300">Nuevo anuncio</Link>
                <Link to="/profile" className="hover:text-gray-300">Mis anuncios</Link>
              </>
            )}
          </div>

          <div className="hidden md:flex md:items-center md:space-x-4">
            {!ready ? (
              <span className="text-gray-300 text-sm">Cargando…</span>
            ) : !user ? (
              <>
                <Link to="/login" className="hover:text-gray-300">Login</Link>
                <Link to="/register" className="hover:text-gray-300">Registrarse</Link>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-300">
                  {user?.profile?.displayName || user?.email}
                </span>
                <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded hover:bg-red-600">Logout</button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => { const next = !isOpen; console.log("[Navbar] toggle mobile ->", next); setIsOpen(next); }}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-gray-700 px-4 pb-4 space-y-2">
          <Link to="/ads" className="block hover:text-gray-300">Anuncios</Link>
          {ready && user && (
            <>
              <Link to="/ads/new" className="block hover:text-gray-300">Nuevo anuncio</Link>
              <Link to="/profile" className="block hover:text-gray-300">Mis anuncios</Link>
            </>
          )}
          {!ready ? (
            <span className="block text-gray-300">Cargando…</span>
          ) : !user ? (
            <>
              <Link to="/login" className="block hover:text-gray-300">Login</Link>
              <Link to="/register" className="block hover:text-gray-300">Registrarse</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="w-full text-left bg-red-500 px-3 py-1 rounded hover:bg-red-600">
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
