import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MultiImageUploader from "../../../components/MultiImageUploader";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function AutosWizard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || undefined;
  const [step, setStep] = useState(1);

  // Catálogos
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [meta, setMeta] = useState({ transmissions: [], fuels: [], years: { min: 1990, max: new Date().getFullYear() } });

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", price: "",
    brand: "", model: "", year: "", mileage: "",
    transmission: "", fuel: "", location: "",
    imageKeys: [],
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [b, m] = await Promise.all([
          fetch(`${API_URL}/autos/brands`).then(r => r.json()),
          fetch(`${API_URL}/autos/meta`).then(r => r.json()),
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
    if (!form.brand) { setModels([]); setForm(f => ({ ...f, model: "" })); return; }
    (async () => {
      try {
        const r = await fetch(`${API_URL}/autos/models?brand=${encodeURIComponent(form.brand)}`);
        const d = await r.json();
        if (!alive) return;
        setModels(d.items || []);
        if (!d.items?.includes(form.model)) setForm(f => ({ ...f, model: "" }));
      } catch {}
    })();
    return () => { alive = false; };
  }, [form.brand]);

  const canNext1 = useMemo(() => {
    return form.title && form.description && form.price && form.brand && form.model && form.year && form.transmission && form.fuel;
  }, [form]);

  const submit = async () => {
    if (!token) { alert("Inicia sesión para publicar"); return; }
    try {
      const res = await fetch(`${API_URL}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title, description: form.description, price: Number(form.price),
          category: "AUTOS",
          brand: form.brand, model: form.model,
          year: form.year ? Number(form.year) : null,
          mileage: form.mileage ? Number(form.mileage) : null,
          transmission: form.transmission || null,
          fuel: form.fuel || null,
          location: form.location || null,
          imageKey: form.imageKeys[0] || null,
          imageKeys: form.imageKeys,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const ad = await res.json();
      navigate(`/ads/${ad.id}`);
    } catch (e) {
      console.error("publish autos error:", e);
      alert("No se pudo publicar");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold">Publicar — Autos</h1>
      <Stepper step={step} setStep={setStep} />
      {step === 1 && (
        <Step1Details form={form} setForm={setForm} brands={brands} models={models} meta={meta} />
      )}
      {step === 2 && (
        <Step2Images imageKeys={form.imageKeys} onChange={(keys)=>setForm(f=>({...f, imageKeys: keys}))} token={token} />
      )}
      {step === 3 && (
        <Step3Review form={form} onSubmit={submit} onBack={()=>setStep(2)} />
      )}
      <div className="flex justify-between">
        <button className="px-3 py-2 border rounded" onClick={() => setStep((s)=>Math.max(1, s-1))} disabled={step===1}>Atrás</button>
        {step === 1 && <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onClick={()=>setStep(2)} disabled={!canNext1}>Continuar</button>}
        {step === 2 && <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>setStep(3)}>Revisar</button>}
      </div>
    </div>
  );
}

function Stepper({ step, setStep }) {
  return (
    <div className="flex gap-3">
      {[1,2,3].map(n=>(
        <button key={n} onClick={()=>setStep(n)}
          className={`px-3 py-1 rounded ${step===n ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
          {n===1?"Detalles":n===2?"Imágenes":"Revisión"}
        </button>
      ))}
    </div>
  );
}

function Step1Details({ form, setForm, brands, models, meta }) {
  const years = Array.from({ length: (meta?.years?.max ?? 2025) - (meta?.years?.min ?? 1990) + 1 },
    (_,i)=> (meta.years.max - i));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <label className="block text-sm mb-1">Título</label>
        <input className="w-full border rounded p-2" value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm mb-1">Descripción</label>
        <textarea className="w-full border rounded p-2" rows={4} value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))}/>
      </div>
      <div>
        <label className="block text-sm mb-1">Precio</label>
        <input type="number" className="w-full border rounded p-2" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))}/>
      </div>
      <div>
        <label className="block text-sm mb-1">Ubicación</label>
        <input className="w-full border rounded p-2" value={form.location} onChange={e=>setForm(f=>({...f, location:e.target.value}))}/>
      </div>
      <div>
        <label className="block text-sm mb-1">Marca</label>
        <select className="w-full border rounded p-2" value={form.brand} onChange={e=>setForm(f=>({...f, brand:e.target.value}))}>
          <option value="">Selecciona</option>
          {brands.map((b)=> <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Modelo</label>
        <select className="w-full border rounded p-2" value={form.model} onChange={e=>setForm(f=>({...f, model:e.target.value}))} disabled={!form.brand}>
          <option value="">Selecciona</option>
          {models.map((m)=> <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Año</label>
        <select className="w-full border rounded p-2" value={form.year} onChange={e=>setForm(f=>({...f, year:e.target.value}))}>
          <option value="">Selecciona</option>
          {years.map(y=> <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Kilometraje (km)</label>
        <input type="number" className="w-full border rounded p-2" value={form.mileage} onChange={e=>setForm(f=>({...f, mileage:e.target.value}))}/>
      </div>
      <div>
        <label className="block text-sm mb-1">Transmisión</label>
        <select className="w-full border rounded p-2" value={form.transmission} onChange={e=>setForm(f=>({...f, transmission:e.target.value}))}>
          <option value="">Selecciona</option>
          {(meta.transmissions||[]).map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Combustible</label>
        <select className="w-full border rounded p-2" value={form.fuel} onChange={e=>setForm(f=>({...f, fuel:e.target.value}))}>
          <option value="">Selecciona</option>
          {(meta.fuels||[]).map(f=> <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
    </div>
  );
}

function Step2Images({ imageKeys, onChange, token }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">Sube hasta 8 imágenes.</p>
      <MultiImageUploader token={token} maxFiles={8} maxSizeMB={10} onChange={onChange}/>
    </div>
  );
}

function Step3Review({ form, onSubmit, onBack }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Revisa tu publicación</h3>
      <ul className="text-sm text-gray-700 space-y-1">
        <li><b>Título:</b> {form.title}</li>
        <li><b>Precio:</b> ${form.price}</li>
        <li><b>Marca/Modelo:</b> {form.brand} {form.model} ({form.year || "s/año"})</li>
        <li><b>Kilometraje:</b> {form.mileage || "N/D"}</li>
        <li><b>Transmisión/Combustible:</b> {form.transmission || "N/D"} / {form.fuel || "N/D"}</li>
        <li><b>Ubicación:</b> {form.location || "N/D"}</li>
        <li><b>Imágenes:</b> {form.imageKeys.length}</li>
      </ul>
      <div className="flex gap-2">
        <button className="px-3 py-2 border rounded" onClick={onBack}>Volver</button>
        <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={onSubmit}>Publicar</button>
      </div>
    </div>
  );
}
