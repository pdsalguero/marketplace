import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DetailsStep() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuel, setFuel] = useState("");
  const [description, setDescription] = useState("");

  const handleNext = () => {
    const base = JSON.parse(sessionStorage.getItem("publishDraft") || "{}");
    sessionStorage.setItem(
      "publishDraft",
      JSON.stringify({
        ...base,
        details: {
          title,
          brand: brand || undefined,
          model: model || undefined,
          year: year ? Number(year) : undefined,
          mileage: mileage ? Number(mileage) : undefined,
          transmission: transmission || undefined,
          fuel: fuel || undefined,
          description,
        },
      })
    );
    navigate("/publish/autos/fotos");
  };

  const field = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fiat Cronos 1.3 2022" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
          <input className={field} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Fiat" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <input className={field} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Cronos" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
          <input className={field} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje</label>
          <input className={field} type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transmisión</label>
          <select className={field} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
            <option value="">Seleccionar…</option>
            <option value="MANUAL">Manual</option>
            <option value="AUTOMATIC">Automática</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Combustible</label>
          <select className={field} value={fuel} onChange={(e) => setFuel(e.target.value)}>
            <option value="">Seleccionar…</option>
            <option value="GASOLINE">Nafta</option>
            <option value="DIESEL">Diésel</option>
            <option value="EV">Eléctrico</option>
            <option value="HYBRID">Híbrido</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea className={field} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between md:justify-end gap-3">
        <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={() => navigate(-1)}>
          Atrás
        </button>
        <button
          disabled={!title}
          className={["px-4 py-2 rounded-lg text-white", title ? "bg-gray-900 hover:bg-black" : "bg-gray-400 cursor-not-allowed"].join(" ")}
          onClick={handleNext}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
