import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function cx(...c) { return c.filter(Boolean).join(" "); }

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#f3f4f6"/>
  <path d="M0 150l80-60 70 50 50-40 120 90H0z" fill="#e5e7eb"/>
  <circle cx="56" cy="56" r="22" fill="#e5e7eb"/>
</svg>`);

function Select({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cx(
        "w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm text-gray-900",
        className
      )}
    >
      {children}
    </select>
  );
}

function ToolbarButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "px-3 py-1.5 text-sm rounded-md transition",
        active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {children}
    </button>
  );
}

export default function AdsList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estado desde URL
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [categorySlug, setCategorySlug] = useState(searchParams.get("categorySlug") || "");
  const [subCategorySlug, setSubCategorySlug] = useState(searchParams.get("subCategorySlug") || "");
  const [provinceSlug, setProvinceSlug] = useState(searchParams.get("provinceSlug") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recent");
  const [view, setView] = useState(searchParams.get("view") || "grid");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize") || 12));

  // Datos auxiliares
  const [cats, setCats] = useState([]);       // categorías nivel 1
  const [subs, setSubs] = useState([]);       // subcategorías del categorySlug
  const [provs, setProvs] = useState([]);

  // Resultados
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // cargar categorías/provincias
  useEffect(() => {
    (async () => {
      try {
        const [rc, rp] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/locations/provinces"),
        ]);
        setCats(rc.ok ? await rc.json() : []);
        const dp = rp.ok ? await rp.json() : { items: [] };
        setProvs(Array.isArray(dp.items) ? dp.items : []);
      } catch {
        setCats([]); setProvs([]);
      }
    })();
  }, []);

  // cargar subcategorías al cambiar categorySlug
  useEffect(() => {
    let abort = false;
    (async () => {
      setSubs([]); setSubCategorySlug("");
      if (!categorySlug) return;
      try {
        const r = await fetch(`/api/categories/${encodeURIComponent(categorySlug)}/children`);
        const d = r.ok ? await r.json() : [];
        if (!abort) setSubs(Array.isArray(d) ? d : []);
      } catch { if (!abort) setSubs([]); }
    })();
    return () => { abort = true; };
  }, [categorySlug]);

  // Sincronizar filtros → URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (categorySlug) next.set("categorySlug", categorySlug);
    if (subCategorySlug) next.set("subCategorySlug", subCategorySlug);
    if (provinceSlug) next.set("provinceSlug", provinceSlug);
    if (sort && sort !== "recent") next.set("sort", sort);
    if (view && view !== "grid") next.set("view", view);
    if (page > 1) next.set("page", String(page));
    if (pageSize !== 12) next.set("pageSize", String(pageSize));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categorySlug, subCategorySlug, provinceSlug, sort, view, page, pageSize]);

  // Consultar API pública /api/ads
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (q) params.set("q", q);
        if (provinceSlug) params.set("provinceSlug", provinceSlug);
        if (subCategorySlug) params.set("subCategorySlug", subCategorySlug);
        else if (categorySlug) params.set("categorySlug", categorySlug);

        const r = await fetch(`/api/ads?${params.toString()}`);
        const d = r.ok ? await r.json() : { items: [], total: 0 };
        if (abort) return;

        let arr = Array.isArray(d.items) ? d.items : [];
        if (sort === "price_asc") arr = arr.slice().sort((a, b) => Number(a.price) - Number(b.price));
        if (sort === "price_desc") arr = arr.slice().sort((a, b) => Number(b.price) - Number(a.price));
        if (sort === "oldest") arr = arr.slice().reverse();

        setItems(arr);
        setTotal(Number(d.total || 0));
      } catch {
        if (!abort) { setItems([]); setTotal(0); }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [q, categorySlug, subCategorySlug, provinceSlug, page, pageSize, sort]);

  const formatPrice = (p, c = "ARS") => `${c} ${Number(p).toLocaleString()}`;

  const resetFilters = () => {
    setQ(""); setCategorySlug(""); setSubCategorySlug(""); setProvinceSlug("");
    setSort("recent"); setPage(1); setPageSize(12); setView("grid");
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <div className="bg-gradient-to-r from-gray-900 to-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Explorar avisos</h1>
              <p className="text-sm text-white/70 mt-1">Encontrá ofertas recientes de todas las categorías.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs ring-1 ring-white/40 shadow-sm text-gray-900">
                Total: {total}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs ring-1 ring-white/40 shadow-sm text-gray-900">
                Página {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
            </div>
          </div>

          {/* BARRA DE FILTROS (texto oscuro dentro de campos blancos) */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_200px_200px_200px_100px] gap-3">
            {/* Título */}
            <div className="relative">
              <input
                className="w-full rounded-xl border border-white/10 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 shadow-sm"
                placeholder="Buscar por título…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => { setQ(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  title="Limpiar"
                >
                  ×
                </button>
              )}
            </div>

            {/* Provincia */}
            <Select value={provinceSlug} onChange={(v) => { setProvinceSlug(v); setPage(1); }} className="border-white/10">
              <option value="">Provincia (todas)</option>
              {provs.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </Select>

            {/* Categoría */}
            <Select value={categorySlug} onChange={(v) => { setCategorySlug(v); setPage(1); }} className="border-white/10">
              <option value="">{cats.length ? "Categoría (todas)" : "Cargando categorías…"}</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>

            {/* Subcategoría (depende de categoría) */}
            <Select
              value={subCategorySlug}
              onChange={(v) => { setSubCategorySlug(v); setPage(1); }}
              className="border-white/10"
              disabled={!categorySlug}
            >
              <option value="">{categorySlug ? (subs.length ? "Subcategoría (todas)" : "Sin subcategorías") : "Elegí categoría"}</option>
              {subs.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </Select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-white/20 bg-white/0 px-3 py-2 text-sm text-white hover:bg-white/10"
                title="Limpiar filtros"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {total
            ? <>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</>
            : <>Sin resultados</>}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sort} onChange={(v) => { setSort(v); setPage(1); }}>
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="price_asc">Precio ↑</option>
            <option value="price_desc">Precio ↓</option>
          </Select>

          <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
            <ToolbarButton active={view === "grid"} onClick={() => setView("grid")}>Grilla</ToolbarButton>
            <ToolbarButton active={view === "list"} onClick={() => setView("list")}>Lista</ToolbarButton>
          </div>

          <Select value={pageSize} onChange={(v) => { setPageSize(Number(v) || 12); setPage(1); }}>
            {[12, 24, 36].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
          </Select>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className={cx(view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" : "space-y-3")}>
            {Array.from({ length: view === "grid" ? 9 : 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white shadow-sm p-3 animate-pulse">
                <div className={cx(view === "grid" ? "aspect-video" : "h-[92px]")} />
                <div className="mt-3 h-4 bg-gray-200 rounded w-3/4" />
                <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <div className="text-sm text-gray-500">No hay avisos que coincidan con tu búsqueda.</div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((it) => (
              <article key={it.id} className="rounded-2xl border bg-white p-3 shadow-sm hover:shadow transition">
                <Link to={`/ads/${it.id}`} className="block">
                  <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                    <img
                      src={it.coverUrl || PLACEHOLDER}
                      alt={it.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                    />
                  </div>
                </Link>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-500">{/* categoría opcional aquí si querés */}</div>
                  <Link to={`/ads/${it.id}`} className="block">
                    <h3 className="font-medium line-clamp-2">{it.title}</h3>
                  </Link>
                  <div className="text-sm">{formatPrice(it.price, it.currency)}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <article key={it.id} className="rounded-xl border bg-white p-3 shadow-sm hover:shadow transition flex items-stretch gap-3">
                <Link to={`/ads/${it.id}`} className="block">
                  <div className="h-[92px] w-[124px] overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={it.coverUrl || PLACEHOLDER}
                      alt={it.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                    />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/ads/${it.id}`} className="block">
                    <h3 className="font-medium truncate text-gray-900">{it.title}</h3>
                  </Link>
                  {/* Podés mostrar categoría/subcategoría acá si lo deseas */}
                </div>

                <div className="w-[160px] shrink-0 flex flex-col items-end justify-center gap-2">
                  <div className="text-sm font-semibold">{formatPrice(it.price, it.currency)}</div>
                  <Link to={`/ads/${it.id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Ver</Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Paginación */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            {total
              ? <>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</>
              : <>Sin resultados</>}
          </div>
          <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cx("px-3 py-1.5 text-sm rounded-md", page === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50")}
            >
              ← Anterior
            </button>
            <span className="px-2 text-sm select-none">Página {page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cx("px-3 py-1.5 text-sm rounded-md", page === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50")}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
