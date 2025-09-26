// frontend/src/pages/ad/AdDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

/** ==== Helpers de API (mismo patrón que el resto) ==== */
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
  return "http://localhost:4000";
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
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const url = buildApiUrl(apiBase, `/api/ads/${encodeURIComponent(id)}`);
        const res = await fetch(url, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || data?.message || `Error ${res.status}`);
        if (alive) setAd(data?.ad || data); // admite {ad:{...}} o objeto directo
      } catch (e) {
        if (alive) setErr(e.message || "No se pudo cargar el aviso");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apiBase, id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-2/3 rounded bg-neutral-200 animate-pulse" />
        <div className="h-5 w-1/3 rounded bg-neutral-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-40 rounded bg-neutral-200 animate-pulse" />
          <div className="h-40 rounded bg-neutral-200 animate-pulse" />
          <div className="h-40 rounded bg-neutral-200 animate-pulse" />
        </div>
        <div className="h-24 rounded bg-neutral-200 animate-pulse" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-3">
        <div className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {err}
        </div>
        <Link to="/" className="inline-block px-4 py-2 rounded bg-neutral-900 text-white">Volver</Link>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-neutral-600">Aviso no encontrado.</div>
        <Link to="/" className="inline-block px-4 py-2 rounded bg-neutral-900 text-white">Volver</Link>
      </div>
    );
  }

  const photos = ad.photos || ad.images || [];
  const price = ad.price ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">{ad.title || "Aviso"}</h1>
        {typeof price === "number" && (
          <div className="text-xl font-semibold text-neutral-900">
            ${price.toLocaleString("es-AR")}
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((src, i) => (
            <img
              key={i}
              src={typeof src === "string" ? src : src.url}
              alt={`foto ${i + 1}`}
              className="w-full h-40 object-cover rounded border border-neutral-200 bg-neutral-50"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <div className="rounded border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-900 mb-2">Descripción</h2>
        <p className="whitespace-pre-line text-neutral-800 text-[15px]">
          {ad.description || "Sin descripción."}
        </p>
      </div>

      {ad.attributes && Object.keys(ad.attributes).length > 0 && (
        <div className="rounded border border-neutral-200 bg-white p-4">
          <h2 className="font-medium text-neutral-900 mb-2">Características</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(ad.attributes).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between">
                <dt className="text-neutral-600 text-sm">{k}</dt>
                <dd className="text-neutral-900 text-sm font-medium">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="pt-2">
        <Link to="/" className="inline-block px-4 py-2 rounded border border-neutral-300">
          ← Volver
        </Link>
      </div>
    </div>
  );
}
