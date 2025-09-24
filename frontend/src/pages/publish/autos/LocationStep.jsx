import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LocationStep() {
  const navigate = useNavigate();
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");

  const handleNext = () => {
    const base = JSON.parse(sessionStorage.getItem("publishDraft") || "{}");
    sessionStorage.setItem("publishDraft", JSON.stringify({ ...base, location: { province, city } }));
    navigate("/publish/autos/detalles");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
            placeholder="Ej: Buenos Aires"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
            placeholder="Ej: La Plata"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between md:justify-end gap-3">
        <button className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50" onClick={() => navigate(-1)}>
          Atrás
        </button>
        <button
          disabled={!province || !city}
          className={[
            "px-4 py-2 rounded-lg text-white",
            province && city ? "bg-gray-900 hover:bg-black" : "bg-gray-400 cursor-not-allowed",
          ].join(" ")}
          onClick={handleNext}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
