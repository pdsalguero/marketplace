import { useEffect, useState } from "react";

export default function SearchFilters({ value, onChange, stats }) {
  const [q, setQ] = useState(value.q || "");
  const [minPrice, setMinPrice] = useState(value.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(value.maxPrice ?? "");
  const [sort, setSort] = useState(value.sort || "created_desc");

  useEffect(() => {
    setQ(value.q || "");
    setMinPrice(value.minPrice ?? "");
    setMaxPrice(value.maxPrice ?? "");
    setSort(value.sort || "created_desc");
  }, [value]);

  const apply = () => {
    onChange({
      q: q || undefined,
      minPrice: minPrice !== "" ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== "" ? Number(maxPrice) : undefined,
      sort,
      page: 1,
    });
  };

  const reset = () => {
    setQ("");
    setMinPrice("");
    setMaxPrice("");
    setSort("created_desc");
    onChange({ q: undefined, minPrice: undefined, maxPrice: undefined, sort: "created_desc", page: 1 });
  };

  return (
    <div className="bg-white border rounded-lg p-3 flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-gray-500 mb-1">Buscar</label>
        <input value={q} onChange={(e)=>setQ(e.target.value)}
          className="w-full border rounded p-2" placeholder="¿Qué estás buscando?" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Min $</label>
        <input type="number" value={minPrice} onChange={(e)=>setMinPrice(e.target.value)}
          className="w-32 border rounded p-2" placeholder={stats?.minPrice ?? 0} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Max $</label>
        <input type="number" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)}
          className="w-32 border rounded p-2" placeholder={stats?.maxPrice ?? 0} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Orden</label>
        <select value={sort} onChange={(e)=>setSort(e.target.value)}
          className="border rounded p-2">
          <option value="created_desc">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={apply} className="bg-blue-600 text-white px-4 py-2 rounded">Aplicar</button>
        <button onClick={reset} className="border px-4 py-2 rounded">Limpiar</button>
      </div>
    </div>
  );
}
