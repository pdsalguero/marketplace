import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Stat({ icon, label, value, soon }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center gap-4">
      <div className="text-3xl">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
      {soon && <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Pronto…</span>}
    </div>
  );
}

function Card({ title, desc, to, soon, children }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
        {soon && (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
            Pronto…
          </span>
        )}
      </div>
      {children}
      <div className="mt-4">
        <Link
          to={to}
          className={`inline-block text-sm px-3 py-2 rounded-xl ${
            soon ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-black"
          }`}
        >
          Abrir
        </Link>
      </div>
    </div>
  );
}

export default function AccountOverview() {
  const { token, user } = useContext(AuthContext);
  const [counts, setCounts] = useState({ listings: null, interested: null, favorites: null });

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!token) return;
      try {
        // Solo para contar anuncios (ligero: pageSize=1)
        const r = await fetch(`/api/users/me/listings?page=1&pageSize=1`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const d = r.ok ? await r.json() : { total: 0 };
        if (!abort) setCounts((c) => ({ ...c, listings: d.total || 0 }));
      } catch {
        if (!abort) setCounts((c) => ({ ...c, listings: 0 }));
      }
    })();
    return () => { abort = true; };
  }, [token]);

  const displayName = user?.profile?.displayName || user?.email || "Usuario";
  const initials = (displayName || "US").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gray-100 border flex items-center justify-center overflow-hidden">
          {user?.profile?.avatarUrl ? (
            <img src={user.profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500 text-lg font-semibold">{initials}</span>
          )}
        </div>
        <div>
          <div className="text-sm text-gray-500">Mi cuenta</div>
          <div className="text-lg font-semibold">{displayName}</div>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon="📦" label="Mis anuncios" value={counts.listings ?? "…"} />
        <Stat icon="✉️" label="Interesados" value={counts.interested ?? "—"} soon />
        <Stat icon="⭐" label="Favoritos" value={counts.favorites ?? "—"} soon />
      </div>

      {/* Tarjetas de acceso a cada sección */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card
          title="Mis Anuncios"
          desc="Revisa, edita o crea nuevas publicaciones."
          to="/account"
        >
          <p className="text-sm text-gray-600">
            Tienes {counts.listings == null ? "…" : counts.listings} anuncio(s).
          </p>
        </Card>

        <Card
          title="Vende más rápido"
          desc="Destaca tus publicaciones para vender antes."
          to="#"
          soon
        />

        <Card
          title="Interesados"
          desc="Conversaciones y contactos sobre tus anuncios."
          to="#"
          soon
        />

        <Card
          title="Búsquedas y favoritos"
          desc="Tus alertas y anuncios guardados."
          to="#"
          soon
        />

        <Card
          title="Planes"
          desc="Paquetes y beneficios para impulsar tus ventas."
          to="#"
          soon
        />

        <Card
          title="Perfil"
          desc="Datos básicos y de contacto asociados a tu cuenta."
          to="/account/profile"
        >
          <ul className="text-sm text-gray-600 list-disc pl-5">
            <li><b>Nombre:</b> {displayName}</li>
            <li><b>Email:</b> {user?.email}</li>
            <li><b>Teléfono:</b> {user?.profile?.phone || "—"}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
