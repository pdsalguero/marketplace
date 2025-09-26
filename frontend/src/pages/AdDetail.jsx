import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

function resolveApiBase() {
  try {
    const viteEnv =
      typeof import.meta !== "undefined" && /** @type {any} */ (import.meta).env
        ? /** @type {any} */ (import.meta).env
        : undefined;
    if (viteEnv?.VITE_API_URL) return viteEnv.VITE_API_URL;
  } catch {}
  if (typeof process !== "undefined" && process.env) {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && window.__API_URL__) return window.__API_URL__;
  return "http://localhost:4001";
}
function buildApiUrl(base, path) {
  const cleanBase = String(base).replace(/\/+$/, "");
  const cleanPath = String(path).replace(/^\/+/, "");
  if (/\/api$/i.test(cleanBase) && /^api\//i.test(cleanPath)) {
    return `${cleanBase}/${cleanPath.replace(/^api\//i, "")}`;
  }
  return `${cleanBase}/${cleanPath}`;
}

export default function AdDetail() {
  const { id } = useParams();
  const apiBase = useMemo(() => resolveApiBase(), []);
  const [ad, setAd] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const token =
          (typeof localStorage !== "undefined" && localStorage.getItem("token")) ||
          (typeof sessionStorage !== "undefined" && sessionStorage.getItem("token")) ||
          null;

        const url = buildApiUrl(apiBase, `/api/ads/${id}`);
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials:
            (typeof import.meta !== "undefined" &&
              /** @type {any} */ (import.meta).env?.VITE_AUTH_COOKIES) === "true"
              ? "include"
              : "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || data?.message || `Error ${res.status}`);
        }
        if (!cancel) setAd(data?.ad || data);
      } catch (e) {
        if (!cancel) setErr(e.message || "No se pudo cargar el aviso");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [apiBase, id]);

  if (loading) return <div className="p-6">Cargando…</div>;
  if (err)
    return (
      <div className="p-6">
        <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-3">
          {err}
        </div>
        <Link to="/ads" className="underline">Volver</Link>
      </div>
    );
  if (!ad)
    return (
      <div className="p-6">
        <div className="text-gray-700">Aviso no encontrado.</div>
        <Link to="/ads" className="underline">Volver</Link>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4 bg-white rounded-lg border">
      <div className="text-sm text-neutral-500">
        <Link to="/ads" className="underline">← Volver</Link>
      </div>
      <h1 className="text-2xl font-semibold">{ad.title || "Sin título"}</h1>
      <div className="text-neutral-700 whitespace-pre-wrap">
        {ad.description || "Sin descripción"}
      </div>
      <div className="text-xl font-bold">
        {typeof ad.price === "number" ? `$ ${ad.price.toLocaleString("es-AR")}` : null}
      </div>
      {Array.isArray(ad.photos) && ad.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {ad.photos.map((p, i) => (
            <img
              key={i}
              src={p.url || p}
              alt={`foto ${i + 1}`}
              className="w-full rounded-lg border"
            />
          ))}
        </div>
      )}
      <div className="text-sm text-neutral-500">ID: {ad.id || ad._id || id}</div>
    </div>
  );
}
