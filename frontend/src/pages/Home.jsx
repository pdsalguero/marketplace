import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function cx(...c) { return c.filter(Boolean).join(" "); }

/** Iconos por categoría (emojis, sin dependencias) */
const CAT_ICONS = {
  "electronica": "📱",
  "hogar-y-cocina": "🍳",
  "deportes-y-fitness": "🏃",
  "moda": "👗",
  "bebes-y-ninos": "🧸",
  "herramientas": "🛠️",
  "mascotas": "🐾",
  "salud-y-belleza": "💄",
  "gaming": "🎮",
  "vehiculos": "🚗",
};

export default function Home() {
  const navigate = useNavigate();

  // filtros del buscador principal
  const [q, setQ] = useState("");
  const [provinceSlug, setProvinceSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [subCategorySlug, setSubCategorySlug] = useState("");

  // data
  const [catsTree, setCatsTree] = useState([]); // [{slug,name,children:[{slug,name,...}]}, ...]
  const [provs, setProvs] = useState([]);
  const subs = useMemo(() => (catsTree.find(c => c.slug === categorySlug)?.children || []), [catsTree, categorySlug]);

  // cargar árbol de categorías (reales) y provincias
  useEffect(() => {
    (async () => {
      try {
        const [rc, rp] = await Promise.all([
          fetch("/api/categories/tree"),
          fetch("/api/locations/provinces"),
        ]);
        const tree = rc.ok ? await rc.json() : [];
        setCatsTree(Array.isArray(tree) ? tree : []);
        const dp = rp.ok ? await rp.json() : { items: [] };
        setProvs(Array.isArray(dp.items) ? dp.items : []);
      } catch {
        setCatsTree([]); setProvs([]);
      }
    })();
  }, []);

  // reset de subcategoría si cambia la categoría
  useEffect(() => { setSubCategorySlug(""); }, [categorySlug]);

  const goSearch = (ev) => {
    ev?.preventDefault?.();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (provinceSlug) params.set("provinceSlug", provinceSlug);
    if (subCategorySlug) params.set("subCategorySlug", subCategorySlug);
    else if (categorySlug) params.set("categorySlug", categorySlug);
    navigate(`/ads?${params.toString()}`);
  };

  const topCats = useMemo(() => {
    // elige las primeras 9 categorías nivel 1 (ordenadas por sortOrder/name del backend)
    return (catsTree || []).slice(0, 9);
  }, [catsTree]);

  return (
    <div className="min-h-screen">
      {/* HERO con buscador grande */}
      <section className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 pt-14 pb-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
              Comprá y vendé cerca tuyo
            </h1>
            <p className="mt-2 text-white/80 text-sm md:text-base">
              Buscá artículos por título, categoría y provincia. Publicar es gratis.
            </p>
          </div>

          {/* Buscador */}
          <form onSubmit={goSearch} className="mt-6 rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-white/20 backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px_200px_120px] gap-2">
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 shadow-sm"
                  placeholder="¿Qué estás buscando? (ej. iPhone 12)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Limpiar"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm"
                value={provinceSlug}
                onChange={(e) => setProvinceSlug(e.target.value)}
              >
                <option value="">Provincia (todas)</option>
                {provs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>

              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              >
                <option value="">{catsTree.length ? "Categoría (todas)" : "Cargando categorías…"}</option>
                {catsTree.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>

              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm"
                value={subCategorySlug}
                onChange={(e) => setSubCategorySlug(e.target.value)}
                disabled={!categorySlug}
              >
                <option value="">
                  {!categorySlug ? "Elegí categoría" : (subs.length ? "Subcategoría (todas)" : "Sin subcategorías")}
                </option>
                {subs.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-black shadow-sm"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* CTA Publicar */}
          <div className="mt-4">
            <Link
              to="/ads/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20 hover:bg-white/15"
            >
              <span>⬆️</span>
              <span>Publicar un aviso</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Categorías principales con iconos (estilo mosaico) */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <h2 className="text-lg font-semibold mb-4">Explorar por categoría</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {topCats.map((c) => {
              const icon = CAT_ICONS[c.slug] || "🛍️";
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => navigate(`/ads?categorySlug=${encodeURIComponent(c.slug)}`)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition"
                  title={c.name}
                >
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-gray-50 text-2xl group-hover:scale-105 transition">
                    <span>{icon}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 text-center line-clamp-2">{c.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {Array.isArray(c.children) ? `${c.children.length} subcategorías` : "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bloque “últimos avisos” (teaser) */}
      <LatestAdsTeaser />
    </div>
  );
}

/** Teaser de últimos avisos activos para el home */
function LatestAdsTeaser() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        // pedimos 6 últimos
        const r = await fetch("/api/ads?page=1&pageSize=6");
        const d = r.ok ? await r.json() : { items: [] };
        if (!abort) setItems(Array.isArray(d.items) ? d.items : []);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  const formatPrice = (p, c = "ARS") => `${c} ${Number(p).toLocaleString()}`;

  return (
    <section className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos avisos</h2>
          <Link to="/ads" className="text-sm text-gray-700 hover:text-black">Ver todos →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white p-3 shadow-sm animate-pulse">
                <div className="aspect-video rounded-xl bg-gray-200" />
                <div className="mt-3 h-4 bg-gray-200 rounded w-3/4" />
                <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <div className="text-sm text-gray-500">Sin avisos por ahora.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((it) => (
              <article key={it.id} className="rounded-2xl border bg-white p-3 shadow-sm hover:shadow-md transition">
                <Link to={`/ads/${it.id}`} className="block">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={it.coverUrl || "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 320 180\'><rect width=\'320\' height=\'180\' fill=\'#f3f4f6\'/></svg>')}
                      alt={it.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 320 180\'><rect width=\'320\' height=\'180\' fill=\'#f3f4f6\'/></svg>'); }}
                    />
                  </div>
                </Link>
                <div className="mt-3 space-y-1">
                  <Link to={`/ads/${it.id}`} className="block">
                    <h3 className="font-medium line-clamp-2">{it.title}</h3>
                  </Link>
                  <div className="text-sm font-semibold">{formatPrice(it.price, it.currency)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
