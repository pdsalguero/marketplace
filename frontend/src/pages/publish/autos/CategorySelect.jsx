// frontend/src/pages/publish/autos/CategorySelect.jsx
import { useEffect, useMemo, useState, useMemo as useMemo2 } from "react";
import { useOutletContext } from "react-router-dom";

/* ===== Helpers de API ===== */
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
async function fetchSubcategoriesSmart(apiBase, slug) {
  const candidates = [
    buildApiUrl(apiBase, `/api/categories/${encodeURIComponent(slug)}/children`),
    buildApiUrl(apiBase, `/api/categories/${encodeURIComponent(slug)}/subcategories`),
    buildApiUrl(apiBase, `/api/subcategories?parent=${encodeURIComponent(slug)}`),
    buildApiUrl(apiBase, `/api/categories/${encodeURIComponent(slug)}`),
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      const items =
        (Array.isArray(data) && data) ||
        (Array.isArray(data.items) && data.items) ||
        (Array.isArray(data.children) && data.children) ||
        (Array.isArray(data.subcategories) && data.subcategories) ||
        (data.category && Array.isArray(data.category.children) && data.category.children) ||
        [];
      return items.map((x) => ({
        slug: x.slug ?? x.code ?? x.id ?? "",
        label: x.label ?? x.name ?? String(x.slug ?? x.code ?? x.id),
        code: x.code ?? null,
        icon: x.icon ?? null,
      }));
    } catch {}
  }
  return [];
}
async function fetchCategoriesSmart(apiBase) {
  const candidates = [
    buildApiUrl(apiBase, "/api/categories"),
    buildApiUrl(apiBase, "/api/catalog/categories"),
    buildApiUrl(apiBase, "/api/category"),
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      const raw =
        (Array.isArray(data) && data) ||
        (Array.isArray(data.items) && data.items) ||
        (Array.isArray(data.categories) && data.categories) ||
        (data.data && Array.isArray(data.data.items) && data.data.items) ||
        [];
      if (!raw.length) continue;
      return raw.map((x) => ({
        slug: x.slug ?? x.code ?? x.id ?? "",
        label: x.label ?? x.name ?? String(x.slug ?? x.code ?? x.id),
        code: x.code ?? null,
        icon: x.icon ?? null,
      }));
    } catch {}
  }
  return [];
}

/* ===== UI tokens (selección oscura + hover más marcado) ===== */
const PANEL = "rounded border border-neutral-300 bg-white shadow-sm";
const HEADER = "px-3 py-2 text-white bg-neutral-500 rounded-t flex items-center gap-2";
const BODY = "p-0";
const LIST = "max-h-[340px] overflow-auto";
const ITEM_BASE =
  "group flex items-center justify-between px-3 py-2 border-b border-neutral-200 transition cursor-pointer";
const ITEM_HOVER = "hover:bg-neutral-200"; // <- hover más oscuro en no seleccionados
const ITEM_SELECTED_DARK =
  "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-900";
const INPUT =
  "w-full rounded border border-neutral-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-300";

/* íconos simples por slug (ajusta a gusto) */
const CAT_ICON = (slug) => {
  if (slug.includes("auto")) return "🚗";
  if (slug.includes("inmueble")) return "🏠";
  if (slug.includes("electro")) return "📱";
  if (slug.includes("hogar")) return "🛋️";
  if (slug.includes("emple")) return "💼";
  if (slug.includes("serv")) return "🧰";
  if (slug.includes("moda")) return "👗";
  if (slug.includes("mascota")) return "🐾";
  return "•";
};

/* ===== Componente ===== */
export default function CategorySelect() {
  const { category, setCategory, subcategory, setSubcategory } = useOutletContext();

  const [categories, setCategories] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [errCat, setErrCat] = useState(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [errSub, setErrSub] = useState(null);

  const [q, setQ] = useState("");

  const apiBase = useMemo(() => resolveApiBase(), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCat(true);
        const items = await fetchCategoriesSmart(apiBase);
        if (alive) setCategories(items);
      } catch (e) {
        if (alive) setErrCat(e.message || "Error inesperado");
      } finally {
        if (alive) setLoadingCat(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!category?.slug) { setSubcats([]); return; }
      try {
        setErrSub(null);
        setLoadingSub(true);
        const items = await fetchSubcategoriesSmart(apiBase, category.slug);
        if (alive) setSubcats(items);
      } catch (e) {
        if (alive) { setSubcats([]); setErrSub(e.message || "Error inesperado"); }
      } finally {
        if (alive) setLoadingSub(false);
      }
    })();
    return () => { alive = false; };
  }, [apiBase, category?.slug]);

  const filteredCats = useMemo2(() => {
    const s = q.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter((c) =>
      (c.label || "").toLowerCase().includes(s) || (c.slug || "").toLowerCase().includes(s)
    );
  }, [q, categories]);

  const filteredSubs = useMemo2(() => {
    const s = q.trim().toLowerCase();
    if (!s) return subcats;
    return subcats.filter((c) =>
      (c.label || "").toLowerCase().includes(s) || (c.slug || "").toLowerCase().includes(s)
    );
  }, [q, subcats]);

  const onSelectCat = (c) => {
    setCategory(c);
    setSubcategory(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-neutral-900">Categoría</h3>
      <input
        className={INPUT}
        placeholder="¿Qué deseas publicar?"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel categorías */}
        <div className={PANEL}>
          <div className={HEADER}>
            <span className="text-sm font-medium">Categorías</span>
          </div>
          <div className={BODY}>
            {loadingCat ? (
              <div className="p-3 text-sm text-neutral-500">Cargando categorías…</div>
            ) : errCat ? (
              <div className="p-3 text-sm text-red-700 bg-red-50 border-b border-red-200">
                {errCat}
              </div>
            ) : (
              <ul className={LIST}>
                {filteredCats.map((c) => {
                  const selected = category?.slug === c.slug;
                  return (
                    <li
                      key={c.slug}
                      role="button"
                      aria-pressed={selected}
                      className={[
                        ITEM_BASE,
                        selected ? ITEM_SELECTED_DARK : ITEM_HOVER,
                      ].join(" ")}
                      onClick={() => onSelectCat(c)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 text-center ${selected ? "opacity-100" : "opacity-80"}`}>
                          {c.icon || CAT_ICON(c.slug)}
                        </span>
                        <span className={`text-[15px] ${selected ? "text-white" : "text-neutral-800"}`}>
                          {c.label}
                        </span>
                      </div>
                      <span className={`${selected ? "text-white/80" : "text-neutral-500 group-hover:text-neutral-700"}`}>
                        ›
                      </span>
                    </li>
                  );
                })}
                {!filteredCats.length && (
                  <li className="px-3 py-2 text-sm text-neutral-500">Sin resultados.</li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Panel subcategorías */}
        <div className={PANEL}>
          <div className={HEADER}>
            <span className="text-sm font-medium">
              {category ? category.label : "Subcategorías"}
            </span>
          </div>
          <div className={BODY}>
            {!category ? (
              <div className="p-3 text-sm text-neutral-500">Elegí una categoría primero.</div>
            ) : loadingSub ? (
              <div className="p-3 text-sm text-neutral-500">Cargando subcategorías…</div>
            ) : errSub ? (
              <div className="p-3 text-sm text-red-700 bg-red-50 border-b border-red-200">{errSub}</div>
            ) : (
              <ul className={LIST}>
                {filteredSubs.map((s) => {
                  const selected = subcategory?.slug === s.slug;
                  return (
                    <li
                      key={s.slug}
                      role="button"
                      aria-pressed={selected}
                      className={[
                        ITEM_BASE,
                        selected ? ITEM_SELECTED_DARK : ITEM_HOVER,
                      ].join(" ")}
                      onClick={() => setSubcategory(s)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 text-center ${selected ? "opacity-100" : "opacity-80"}`}>
                          {s.icon || "•"}
                        </span>
                        <span className={`text-[15px] ${selected ? "text-white" : "text-neutral-800"}`}>
                          {s.label}
                        </span>
                      </div>
                      <span className={`${selected ? "text-white/80" : "text-neutral-500 group-hover:text-neutral-700"}`}>
                        ›
                      </span>
                    </li>
                  );
                })}
                {!filteredSubs.length && (
                  <li className="px-3 py-2 text-sm text-neutral-500">No hay subcategorías.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
