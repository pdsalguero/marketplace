import React, { useContext, useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// --- UI helpers
const Title = ({ children }) => (
  <h1 className="text-xl md:text-2xl font-bold tracking-tight">{children}</h1>
);

const StatCard = ({ icon, label, value }) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

function MenuItem({ to, icon, label, disabled, badge }) {
  const loc = useLocation();
  const isActive = useMemo(() => loc.pathname.startsWith(to), [loc.pathname, to]);
  const base =
    "flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition";
  const active = "bg-gray-900 text-white";
  const inactive = "hover:bg-gray-100 text-gray-800";
  const content = (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <span className="text-sm md:text-base">{label}</span>
    </div>
  );
  const right = badge != null ? (
    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-gray-200"}`}>
      {badge}
    </span>
  ) : null;

  if (disabled) {
    return (
      <div className={`${base} opacity-50 cursor-not-allowed ${inactive}`}>
        {content}
      </div>
    );
  }
  return (
    <Link to={to} className={`${base} ${isActive ? active : inactive}`}>
      {content}
      {right}
    </Link>
  );
}

// --- main page
export default function Account() {
  const { user, token, logout, refreshMe, setUser } = useContext(AuthContext);
  const nav = useNavigate();

  const [stats, setStats] = useState({ listings: 0, favorites: 0, interested: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // cargar stats básicas (tus endpoints pueden variar)
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!token) return;
      try {
        setLoadingStats(true);
        // Mis anuncios
        const r1 = await fetch(`/api/users/me/listings?page=1&pageSize=1`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const d1 = r1.ok ? await r1.json() : { total: 0 };

        // Si tienes endpoints de favoritos/interesados, ajusta aquí:
        const favorites = 0;  // TODO: /api/users/me/favorites/count
        const interested = 0; // TODO: /api/users/me/interested/count

        if (!abort) setStats({ listings: d1.total || 0, favorites, interested });
      } catch {
        if (!abort) setStats({ listings: 0, favorites: 0, interested: 0 });
      } finally {
        if (!abort) setLoadingStats(false);
      }
    })();
    return () => { abort = true; };
  }, [token]);

  const displayName = user?.profile?.displayName || user?.email || "Usuario";

  const onLogout = () => { logout(); nav("/login"); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="md:col-span-4 lg:col-span-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          {/* Perfil mini */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
              {displayName?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm text-gray-500">ID Usuario</div>
              <div className="font-medium truncate max-w-[180px]" title={displayName}>{displayName}</div>
            </div>
          </div>

          <div className="space-y-1">
            <MenuItem to="/account" icon="📦" label="Mis Anuncios" badge={stats.listings} />
            <MenuItem to="/account/boost" icon="⚙️" label="Vende más rápido" />
            <MenuItem to="/account/interested" icon="✉️" label="Interesados" badge={stats.interested} />
            <MenuItem to="/account/saved" icon="⭐" label="Mis búsquedas y favoritos" badge={stats.favorites} />
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

      {/* Main */}
      <section className="md:col-span-8 lg:col-span-9">
        <div className="rounded-2xl border bg-white p-5 shadow-sm mb-6">
          <Title>Bienvenido/a</Title>
          <p className="text-gray-500">
            Administra tus anuncios, favoritos y datos de tu cuenta desde aquí.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon="📦" label="Mis anuncios" value={loadingStats ? "…" : stats.listings} />
          <StatCard icon="✉️" label="Interesados" value={loadingStats ? "…" : stats.interested} />
          <StatCard icon="⭐" label="Favoritos" value={loadingStats ? "…" : stats.favorites} />
        </div>

        {/* Lista rápida de anuncios (últimos 3) */}
        <LatestListings token={token} />

        {/* Nested routes (perfil/planes/etc.) */}
        <Outlet />
      </section>
    </div>
  );
}

function LatestListings({ token }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!token) return;
      try {
        const res = await fetch(`/api/users/me/listings?page=1&pageSize=3`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = res.ok ? await res.json() : { items: [] };
        if (!abort) setItems(data.items || []);
      } catch {
        if (!abort) setItems([]);
      }
    })();
    return () => { abort = true; };
  }, [token]);

  if (items === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white p-3 shadow-sm animate-pulse">
            <div className="aspect-video bg-gray-200 rounded-xl mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="font-medium mb-1">No tienes anuncios publicados</p>
          <p className="text-sm">Pulsa “Nuevo anuncio” para crear tu primera publicación.</p>
          <Link
            to="/ads/new"
            className="inline-block mt-3 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black"
          >
            Publicar anuncio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Tus últimos anuncios</h2>
        <Link to="/profile" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((ad) => (
          <article key={ad.id} className="rounded-2xl border p-3 hover:shadow-md transition">
            <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-3">
              {ad.media?.[0]?.url ? (
                <img src={ad.media[0].url} alt={ad.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">🖼️</div>
              )}
            </div>
            <h3 className="font-medium line-clamp-2">{ad.title}</h3>
            <div className="text-sm text-gray-500 line-clamp-1">{ad.category?.name}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
