import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

export default function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => { setIsAuth(!!localStorage.getItem("token")); }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuth(false);
    navigate("/login");
  };

  const nav = [
    { to: "/ads", label: "Anuncios" },
    { to: "/publish", label: "Publicar" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gray-900 text-white flex items-center justify-center font-bold">M</div>
            <span className="text-base sm:text-lg font-semibold tracking-tight">Marketplace</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                classNames("px-3 py-2 rounded-lg text-sm transition",
                  isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {isAuth ? (
            <>
              <Link to="/account" className="px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Mi cuenta</Link>
              <button type="button" onClick={logout} className="px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black">Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">Iniciar sesión</Link>
              <Link to="/register" className="px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black">Crear cuenta</Link>
            </>
          )}
        </div>

        {/* FIX: type="button" para no enviar forms */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          <svg className="size-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {open ? (
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-3 flex flex-col gap-2">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  classNames("w-full px-3 py-2 rounded-lg text-sm",
                    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")}
              >
                {n.label}
              </NavLink>
            ))}
            <div className="h-px bg-gray-200 my-1" />
            {isAuth ? (
              <>
                <Link to="/account" onClick={() => setOpen(false)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 text-center">Mi cuenta</Link>
                <button type="button" onClick={() => { setOpen(false); logout(); }} className="w-full px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black">Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 text-center">Iniciar sesión</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="w-full px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black text-center">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
