import { useEffect, useState } from "react";
const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function AutosFilters({ value, onChange }) {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [meta, setMeta] = useState({ transmissions: [], fuels: [], years: { min: 1990, max: new Date().getFullYear() } });

  const v = value || {};

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [b, m] = await Promise.all([
          fetch(`${API_URL}/autos/brands`).then(r=>r.json()),
          fetch(`${API_URL}/autos/meta`).then(r=>r.json()),
        ]);
        if (!alive) return;
        setBrands(b.items || []);
        setMeta(m || meta);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!v.brand) { setModels([]); return; }
    (async () => {
      try {
        const r = await fetch(`${API_URL}/autos/models?brand=${encodeURIComponent(v.brand)}`);
        const d = await r.json();
        if (!alive) return;
        setModels(d.items || []);
      } catch {}
    })();
    return () => { alive = false; };
  }, [v.brand]);

  const apply = (patch) => onChange({ ...v, ...patch, page: 1 });

  return (
    <div className="bg-white border rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 mb-1">Marca</label>
        <select className="w-full border rounded p-2" value={v.brand || ""} onChange={e=>apply({ brand: e.target.value || undefined, model: undefined })}>
          <option value="">Todas</option>
          {brands.map(b=> <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 mb-1">Modelo</label>
        <select className="w-full border rounded p-2" value={v.model || ""} onChange={e=>apply({ model: e.target.value || undefined })} disabled={!v.brand}>
          <option value="">Todos</option>
          {models.map(m=> <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Año desde</label>
        <select className="w-full border rounded p-2" value={v.yearMin || ""} onChange={e=>apply({ yearMin: e.target.value || undefined })}>
          <option value="">Cualquiera</option>
          {Array.from({length: meta.years.max-(meta.years.min)+1},(_,i)=>meta.years.max-i).map(y=> <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Año hasta</label>
        <select className="w-full border rounded p-2" value={v.yearMax || ""} onChange={e=>apply({ yearMax: e.target.value || undefined })}>
          <option value="">Cualquiera</option>
          {Array.from({length: meta.years.max-(meta.years.min)+1},(_,i)=>meta.years.max-i).map(y=> <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Km máx.</label>
        <input type="number" className="w-full border rounded p-2" value={v.mileageMax || ""} onChange={e=>apply({ mileageMax: e.target.value || undefined })} placeholder="Ej: 100000" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Transmisión</label>
        <select className="w-full border rounded p-2" value={v.transmission || ""} onChange={e=>apply({ transmission: e.target.value || undefined })}>
          <option value="">Todas</option>
          {(meta.transmissions||[]).map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Combustible</label>
        <select className="w-full border rounded p-2" value={v.fuel || ""} onChange={e=>apply({ fuel: e.target.value || undefined })}>
          <option value="">Todos</option>
          {(meta.fuels||[]).map(f=> <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 mb-1">Ubicación</label>
        <input className="w-full border rounded p-2" value={v.location || ""} onChange={e=>apply({ location: e.target.value || undefined })} placeholder="Ciudad/Región" />
      </div>
    </div>
  );
}
