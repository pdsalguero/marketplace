import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CategoryGrid from "../components/CategoryGrid";
import AdCard from "../components/AdCard";
import Pagination from "../components/Pagination";
import SearchFilters from "../components/SearchFilters";
import AutosFilters from "../components/AutosFilters";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 12);

  const state = useMemo(() => ({
    q: params.get("q") || undefined,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    sort: params.get("sort") || "created_desc",
    category: params.get("category") || undefined,
    // autos extras
    brand: params.get("brand") || undefined,
    model: params.get("model") || undefined,
    yearMin: params.get("yearMin") ? Number(params.get("yearMin")) : undefined,
    yearMax: params.get("yearMax") ? Number(params.get("yearMax")) : undefined,
    mileageMax: params.get("mileageMax") ? Number(params.get("mileageMax")) : undefined,
    transmission: params.get("transmission") || undefined,
    fuel: params.get("fuel") || undefined,
    location: params.get("location") || undefined,
    page, pageSize,
  }), [params, page, pageSize]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        const s = await fetch(`${API_URL}/ads/stats/basic`).then(r=>r.ok?r.json():null);
        if (alive) setStats(s);

        const url = new URL(`${API_URL}/ads`);
        ["q","minPrice","maxPrice","sort","category","brand","model","yearMin","yearMax","mileageMax","transmission","fuel","location","page","pageSize"]
          .forEach((k) => {
            const v = state[k];
            if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
          });

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
      } catch (err) {
        console.error("Home load error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [JSON.stringify(state)]);

  const updateFilters = (next) => {
    const merged = { ...state, ...next };
    const sp = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    });
    setParams(sp, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <CategoryGrid />

      {/* Filtros comunes */}
      <SearchFilters value={state} onChange={updateFilters} stats={stats} />

      {/* Filtros avanzados de Autos */}
      {state.category === "AUTOS" && (
        <AutosFilters value={state} onChange={updateFilters} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: state.pageSize }).map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="w-full h-48 bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-100 animate-pulse w-3/4 rounded" />
                <div className="h-3 bg-gray-100 animate-pulse w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500 py-10">No encontramos resultados.</div>
      ) : (
        <>
          <div className="text-sm text-gray-500">{total} resultados</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((ad) => <AdCard key={ad.id} ad={ad} />)}
          </div>
          <Pagination
            page={state.page}
            pageSize={state.pageSize}
            total={total}
            onPageChange={(p) => updateFilters({ page: p })}
          />
        </>
      )}
    </div>
  );
}
