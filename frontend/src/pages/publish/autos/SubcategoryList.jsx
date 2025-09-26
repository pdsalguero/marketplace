import { useEffect, useMemo, useState } from "react";

function resolveApiBase() {
  try {
    const viteEnv = (typeof import.meta !== "undefined" && /** @type {any} */ (import.meta).env) || undefined;
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

/** Props: categorySlug, value, onChange */
export default function SubcategoryList({ categorySlug, value = null, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const apiBase = useMemo(() => resolveApiBase(), []);

  useEffect(() => {
    if (!categorySlug) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(buildApiUrl(apiBase, `/api/categories/${encodeURIComponent(categorySlug)}/children`));
        if (!res.ok) throw new Error(`No se pudo cargar subcategorías (${res.status})`);
        const data = await res.json();
        if (alive) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (alive) setErr(e.message || "Error inesperado");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [apiBase, categorySlug]);

  if (!categorySlug) return null;
  if (loading) return <div className="p-2">Cargando subcategorías…</div>;
  if (err) return <div className="p-2 text-red-600">{err}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {items.map((s) => {
        const selected = value?.slug === s.slug;
        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onChange?.(s)}
            className={`text-left p-3 rounded-lg border transition ${selected ? "ring-2" : ""}`}
          >
            <span className="mr-2">{s.icon || "•"}</span>
            <span className="font-medium">{s.label}</span>
          </button>
        );
      })}
      {!items.length && (
        <div className="p-2 text-sm text-gray-500">No hay subcategorías para esta categoría.</div>
      )}
    </div>
  );
}
