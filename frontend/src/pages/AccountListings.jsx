import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function cx(...c) { return c.filter(Boolean).join(" "); }

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="#f3f4f6"/>
  <path d="M0 150l80-60 70 50 50-40 120 90H0z" fill="#e5e7eb"/>
  <circle cx="56" cy="56" r="22" fill="#e5e7eb"/>
</svg>`);

const VIEW_KEY = "accountListingsView";           // "grid" | "list"
const PAGESIZE_KEY = "accountListingsPageSize";   // por vista
const SEARCH_KEY = "accountListingsSearch";
const STATUS_KEY = "accountListingsStatus";

const STATUS_STYLE = {
  pending:   "bg-amber-50 text-amber-700 ring-amber-200",
  active:    "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paused:    "bg-gray-100 text-gray-700 ring-gray-300",
  rejected:  "bg-rose-50 text-rose-700 ring-rose-200",
  expired:   "bg-slate-100 text-slate-700 ring-slate-300",
  sold_out:  "bg-indigo-50 text-indigo-700 ring-indigo-200",
  draft:     "bg-sky-50 text-sky-700 ring-sky-200",
};

const STATUS_OPTIONS = [
  { value: "",        label: "Todos" },
  { value: "active",  label: "Activo" },
  { value: "pending", label: "Pendiente" },
  { value: "paused",  label: "Pausado" },
  { value: "rejected",label: "Rechazado" },
  { value: "expired", label: "Expirado" },
  { value: "sold_out",label: "Sin stock" },
  { value: "draft",   label: "Borrador" },
];

function Badge({ children, tone = "bg-gray-100 text-gray-700 ring-gray-300" }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1", tone)}>{children}</span>;
}
function ToolbarButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={cx("px-3 py-1.5 text-sm rounded-md transition", active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50")}
    >
      {children}
    </button>
  );
}
function Select({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cx("rounded-lg border bg-white px-3 py-1.5 text-sm shadow-sm", className)}
    >
      {children}
    </select>
  );
}

export default function AccountListings() {
  const { token } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || "list");
  const [sort, setSort] = useState("created_desc"); // created_desc|created_asc|price_asc|price_desc|status
  const [page, setPage] = useState(1);

  const pageSizeDefault = view === "grid" ? 9 : 10;
  const [pageSize, setPageSize] = useState(() => {
    const saved = Number(localStorage.getItem(`${PAGESIZE_KEY}:${view}`));
    return Number.isFinite(saved) && saved > 0 ? saved : pageSizeDefault;
  });

  const [searchRaw, setSearchRaw] = useState(() => localStorage.getItem(SEARCH_KEY) || "");
  const [search, setSearch] = useState(searchRaw);
  const [status, setStatus] = useState(() => localStorage.getItem(STATUS_KEY) || "");

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch("/api/account/listings", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const d = r.ok ? await r.json() : { items: [] };
        if (!abort) setItems(Array.isArray(d.items) ? d.items : []);
      } catch {
        if (!abort) setItems([]);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [token]);

  const setViewPersist = (v) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
    const saved = Number(localStorage.getItem(`${PAGESIZE_KEY}:${v}`));
    setPageSize(Number.isFinite(saved) && saved > 0 ? saved : (v === "grid" ? 9 : 10));
    setPage(1);
  };
  const setPageSizePersist = (n) => {
    const val = Number(n) || pageSizeDefault;
    setPageSize(val);
    try { localStorage.setItem(`${PAGESIZE_KEY}:${view}`, String(val)); } catch {}
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchRaw.trim());
      try { localStorage.setItem(SEARCH_KEY, searchRaw.trim()); } catch {}
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchRaw]);

  const onStatusChange = (v) => {
    setStatus(v);
    try { localStorage.setItem(STATUS_KEY, v); } catch {}
    setPage(1);
  };

  const formatPrice = (p, c = "ARS") => {
    const n = Number(p);
    if (!Number.isFinite(n)) return `${c} ${p}`;
    return `${c} ${n.toLocaleString()}`;
  };

  const filtered = useMemo(() => {
    const q = search.toLocaleLowerCase();
    return items.filter((it) => {
      const okTitle = q ? String(it.title || "").toLocaleLowerCase().includes(q) : true;
      const okStatus = status ? String(it.status) === status : true;
      return okTitle && okStatus;
    });
  }, [items, search, status]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const byCreated = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
    const byPrice = (a, b) => Number(a.price) - Number(b.price);
    const byStatus = (a, b) => String(a.status).localeCompare(String(b.status));
    switch (sort) {
      case "created_asc":  copy.sort(byCreated); break;
      case "price_asc":    copy.sort(byPrice); break;
      case "price_desc":   copy.sort((a, b) => -byPrice(a, b)); break;
      case "status":       copy.sort(byStatus); break;
      case "created_desc":
      default:             copy.sort((a, b) => -byCreated(a, b)); break;
    }
    return copy;
  }, [filtered, sort]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const sliceStart = (pageClamped - 1) * pageSize;
  const pageItems = sorted.slice(sliceStart, sliceStart + pageSize);

  const Pager = () => (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="text-sm text-gray-600">
        {total ? <>Mostrando {sliceStart + 1}–{Math.min(sliceStart + pageSize, total)} de {total}</> : <>Sin resultados</>}
      </div>
      <div className="flex items-center gap-2">
        <Select value={pageSize} onChange={setPageSizePersist}>
          {(view === "grid" ? [6, 9, 12, 15] : [5, 10, 15, 20]).map((n) => (
            <option key={n} value={n}>{n} / pág.</option>
          ))}
        </Select>
        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageClamped === 1}
            className={cx("px-3 py-1.5 text-sm rounded-md", pageClamped === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50")}
          >
            ← Anterior
          </button>
          <span className="px-2 text-sm select-none">Página {pageClamped} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageClamped === totalPages}
            className={cx("px-3 py-1.5 text-sm rounded-md", pageClamped === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50")}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-4 py-6">
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Mis Anuncios</h1>

          <div className="flex items-center gap-2">
            <Select value={sort} onChange={setSort}>
              <option value="created_desc">Más recientes</option>
              <option value="created_asc">Más antiguos</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="status">Estado (A→Z)</option>
            </Select>

            <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
              <ToolbarButton active={view === "grid"} onClick={() => setViewPersist("grid")}>Grilla</ToolbarButton>
              <ToolbarButton active={view === "list"} onClick={() => setViewPersist("list")}>Lista</ToolbarButton>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <input
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm pr-8"
                placeholder="Buscar por título…"
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
              />
              {searchRaw && (
                <button
                  type="button"
                  onClick={() => setSearchRaw("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpiar"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <Select value={status} onChange={onStatusChange} className="min-w-[160px]">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : !items.length ? (
        <div className="text-sm text-gray-500">Aún no publicaste anuncios.</div>
      ) : view === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pageItems.map((it) => (
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
                  <div className="flex items-center gap-2">
                    <Badge>{it.categoryName}</Badge>
                    <Badge tone={STATUS_STYLE[it.status] || STATUS_STYLE.pending}>{it.status}</Badge>
                  </div>
                  <Link to={`/ads/${it.id}`} className="block">
                    <h3 className="font-medium line-clamp-2">{it.title}</h3>
                  </Link>
                  <div className="text-sm">{formatPrice(it.price, it.currency)}</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Link to={`/ads/${it.id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Ver</Link>
                  <Link to={`/ads/${it.id}/edit`} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black">Editar</Link>
                </div>
              </article>
            ))}
          </div>
          <Pager />
        </>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((it) => (
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
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{it.categoryName}</Badge>
                    <Badge tone={STATUS_STYLE[it.status] || STATUS_STYLE.pending}>{it.status}</Badge>
                  </div>
                  <Link to={`/ads/${it.id}`} className="block">
                    <h3 className="font-medium truncate text-gray-900">{it.title}</h3>
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">Publicado: {new Date(it.createdAt).toLocaleDateString()}</div>
                </div>

                <div className="w-[180px] shrink-0 flex flex-col items-end justify-center gap-2">
                  <div className="text-sm font-semibold">{formatPrice(it.price, it.currency)}</div>
                  <div className="flex items-center gap-2">
                    <Link to={`/ads/${it.id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Ver</Link>
                    <Link to={`/ads/${it.id}/edit`} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black">Editar</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pager />
        </>
      )}
    </div>
  );
}
