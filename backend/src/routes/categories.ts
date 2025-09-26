// frontend/src/pages/publish/autos/CategorySelect.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

/** Base del API compatible Vite/CRA/Next + fallback */
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
  return "http://localhost:4000"; // puerto real de tu API en dev
}

/** Une base + path evitando barras duplicadas y doble /api */
function buildApiUrl(base, path) {
  const cleanBase = String(base).replace(/\/+$/, "");
  const cleanPath = String(path).replace(/^\/+/, "");
  if (/\/api$/i.test(cleanBase) && /^api\//i.test(cleanPath)) {
    return `${cleanBase}/${cleanPath.replace(/^api\//i, "")}`;
  }
  return `${cleanBase}/${cleanPath}`;
}

/** Intenta varias rutas posibles para subcategorías y normaliza la respuesta */
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
      // normalización: soporta ARRAY directo y varios envoltorios comunes
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
    } catch {
      /* intentar siguiente */
    }
  }
  // si nada funcionó, devolvemos vacío
  return [];
}

/** Normaliza CATEGORÍAS desde múltiples formatos */
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
    } catch {
      /* intentar siguiente */
    }
  }
  return [];
}

/**
 * Paso 1 del wizard:
 * - IZQUIERDA: lista de CATEGORÍAS
 * - DERECHA:   lista de SUBCATEGORÍAS
 * Estado compartido via Outlet context (AutosWizard).
 */
export default function CategorySelect() {
  const { category, setCategory, subcategory, setSubcategory } = useOutletContext();

  const [categories, setCategories] = useState([]); // [{slug,label,code,icon}]
  const [subcats, setSubcats] = useState([]);       // idem
  const [loadingCat, setLoadingCat] = useState(true);
  const [errCat, setErrCat] = useState(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [errSub, setErrSub] = useState(null);

  const apiBase = useMemo(() => resolveApiBase(), []);

  // Cargar CATEGORÍAS al montar
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCat(true);
        const items = await fetchCategoriesSmart(apiBase);
        if (alive) {
          setCategories(items);
          // si ya había categoría seleccionada pero ya no existe en la lista, resetea
          if (category && !items.find((i) => i.slug === category.slug)) {
            setCategory(null);
            setSubcategory(null);
          }
        }
      } catch (e) {
        if (alive) setErrCat(e.message || "Error inesperado");
      } finally {
        if (alive) setLoadingCat(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // Cargar SUBCATEGORÍAS cuando cambia la categoría seleccionada
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
  }, [apiBase, category?.slug, setSubcats]);

  const handleSelectCategory = (c) => {
    setCategory(c);
    setSubcategory(null); // reset subcat al cambiar categoría
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* IZQUIERDA: CATEGORÍAS */}
      <div className="rounded-2xl p-4 border">
        <h3 className="font-semibold text-lg mb-2">Categorías</h3>
        {loadingCat ? (
          <div className="p-2">Cargando categorías…</div>
        ) : errCat ? (
          <div className="p-2 text-red-600">{errCat}</div>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => {
              const selected = category?.slug === c.slug;
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(c)}
                    className={`w-full text-left p-3 rounded-lg border transition ${selected ? "ring-2" : ""}`}
                  >
                    <span className="mr-2">{c.icon || "•"}</span>
                    <span className="font-medium">{c.label}</span>
                  </button>
                </li>
              );
            })}
            {!categories.length && (
              <li className="text-sm text-gray-500">No hay categorías disponibles.</li>
            )}
          </ul>
        )}
      </div>

      {/* DERECHA: SUBCATEGORÍAS */}
      <div className="rounded-2xl p-4 border">
        <h3 className="font-semibold text-lg mb-2">Subcategorías</h3>
        {!category && <div className="text-sm text-gray-500">Elegí una categoría primero.</div>}
        {category && (
          <>
            {loadingSub ? (
              <div className="p-2">Cargando subcategorías…</div>
            ) : errSub ? (
              <div className="p-2 text-red-600">{errSub}</div>
            ) : subcats.length ? (
              <ul className="space-y-2">
                {subcats.map((s) => {
                  const selected = subcategory?.slug === s.slug;
                  return (
                    <li key={s.slug}>
                      <button
                        type="button"
                        onClick={() => setSubcategory(s)}
                        className={`w-full text-left p-3 rounded-lg border transition ${selected ? "ring-2" : ""}`}
                      >
                        <span className="mr-2">{s.icon || "•"}</span>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No hay subcategorías.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
