import React, { useEffect, useMemo, useState } from "react";

// util simple para formatear
const money = (v) =>
  typeof v === "number"
    ? v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-3 animate-pulse">
      <div className="aspect-video bg-gray-200 rounded-xl mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-6 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🧐</div>
      <h3 className="text-lg font-semibold mb-2">No encontramos anuncios</h3>
      <p className="text-gray-500 mb-6">Proba cambiar la búsqueda o filtros.</p>
      <button
        onClick={onReset}
        className="px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

export default function AdsList() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  // params memoizados
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [q, category, page]);

  // cargar categorías (una vez)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCats(data?.items || data || []);
        }
      } catch {}
    })();
  }, []);

  // cargar anuncios
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ads?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!abort) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!abort) { setItems([]); setTotal(0); }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [params]);

  const resetFilters = () => {
    setQ("");
    setCategory("");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero compacto */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">¿Qué estás buscando?</h1>
        <p className="text-gray-500">Compra y vende vehículos y más, fácil y rápido.</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por título, descripción…"
            className="col-span-2 border rounded-xl px-3 py-2"
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="border rounded-xl px-3 py-2"
          >
            <option value="">Todas las categorías</option>
            {cats.map((c) => (
              <option key={c.id || c.slug} value={c.slug || c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(1)}
              className="flex-1 px-3 py-2 rounded-xl border hover:bg-gray-50"
            >
              Filtrar
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState onReset={resetFilters} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((ad) => (
              <article key={ad.id} className="bg-white rounded-2xl shadow-sm border p-3 hover:shadow-md transition">
                <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-3">
                  {ad.coverUrl ? (
                    <img src={ad.coverUrl} alt={ad.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">🖼️</div>
                  )}
                </div>
                <h3 className="font-semibold line-clamp-2">{ad.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{ad.subtitle || ad.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{money(ad.price)}</span>
                  <span className="text-xs text-gray-400">{ad.locationName || ad.city}</span>
                </div>
              </article>
            ))}
          </div>

          {/* Paginación */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-2 rounded-xl border ${page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`px-3 py-2 rounded-xl border ${page >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
            >
              Siguiente →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
