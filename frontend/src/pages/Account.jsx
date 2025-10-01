import React, { useContext, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function MenuItem({ to, icon, label }) {
  const loc = useLocation();
  const isActive = useMemo(() => {
    // Activo si el path comienza con el destino
    if (to === "/account") return loc.pathname === "/account";
    return loc.pathname.startsWith(to);
  }, [loc.pathname, to]);

  const base = "flex items-center gap-3 px-3 py-2 rounded-xl transition";
  const active = "bg-gray-900 text-white";
  const inactive = "hover:bg-gray-100 text-gray-800";

  return (
    <Link to={to} className={`${base} ${isActive ? active : inactive}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm md:text-base">{label}</span>
    </Link>
  );
}

export default function Account() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.profile?.displayName || user?.email || "Usuario";
  const initials = (displayName || "US").slice(0, 2).toUpperCase();

  const onLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="md:col-span-4 lg:col-span-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {/* Encabezado del perfil: AHORA ES LINK a /account/overview */}
          <div className="flex items-center gap-3 mb-4">
            <Link
              to="/account/overview"
              className="flex items-center gap-3 flex-1 group"
              title="Ir al resumen de mi cuenta"
            >
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
                {initials}
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-500 group-hover:text-gray-700">Mi cuenta</div>
                <div className="font-medium truncate group-hover:underline">{displayName}</div>
              </div>
            </Link>
            {/* Botón de despliegue SOLO móvil */}
            <button
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Mostrar/ocultar menú"
            >
              ▾
            </button>
          </div>

          {/* Menú */}
          <div className={`${isOpen ? "block" : "hidden"} md:block space-y-1`}>
            {/* Puedes dejar /account/overview también aquí si lo quieres en el menú */}
            <MenuItem to="/account/overview" icon="🏠" label="Resumen" />
            {/* Mis Anuncios ahora apunta a /account/listings para diferenciarlo del resumen */}
            <MenuItem to="/account/listings" icon="📦" label="Mis Anuncios" />
            <MenuItem to="/account/boost" icon="⚙️" label="Vende más rápido" />
            <MenuItem to="/account/interested" icon="✉️" label="Interesados" />
            <MenuItem to="/account/saved" icon="⭐" label="Búsquedas y favoritos" />
            <MenuItem to="/account/plans" icon="📅" label="Planes" />
            <MenuItem to="/account/profile" icon="👤" label="Perfil" />
            <button
              onClick={onLogout}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50"
            >
              <span className="text-lg">⏻</span>
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido de la sección seleccionada */}
      <section className="md:col-span-8 lg:col-span-9">
        <Outlet />
      </section>
    </div>
  );
}
