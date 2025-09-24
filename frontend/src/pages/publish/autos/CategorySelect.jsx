import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const GROUP = { label: "Vehículos", icon: "🚗", categoryEnum: "AUTOS" };
const SUBCATEGORIES = [
  { key: "AUTOS_USADOS", label: "Autos Usados" },
  { key: "AUTOS_NUEVOS", label: "Autos Nuevos" },
  { key: "MOTOS", label: "Motos" },
  { key: "CAMIONES_BUSES", label: "Camiones y Buses" },
];

export default function CategorySelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleContinue = () => {
    if (!selected) return;
    sessionStorage.setItem(
      "publishDraft",
      JSON.stringify({ categoryEnum: GROUP.categoryEnum, subcategory: selected })
    );
    navigate("/publish/autos/ubicacion");
  };

  return (
    <div className="space-y-5">
      {/* Search-like input (decorativo por ahora) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <input
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
          placeholder="¿Qué deseas publicar?"
        />
      </div>

      {/* Two-column responsive: stack en mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Izquierda: card del grupo */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="px-4 py-3 rounded-t-xl bg-gray-800 text-white font-medium flex items-center gap-2">
            <span className="text-lg">{GROUP.icon}</span>
            <span>{GROUP.label} ›</span>
          </div>
          <div className="p-4 text-sm text-gray-500">Elegí un tipo en la derecha.</div>
        </div>

        {/* Derecha: subcategorías */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 rounded-t-xl bg-gray-800 text-white font-medium">{GROUP.label}</div>
          <ul className="p-2 sm:p-3 grid grid-cols-1">
            {SUBCATEGORIES.map((s) => {
              const active = selected === s.key;
              return (
                <li key={s.key} className="p-1">
                  <button
                    onClick={() => setSelected(s.key)}
                    className={[
                      "w-full text-left px-4 py-3 rounded-lg border transition",
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Footer sticky en mobile */}
      <div className="h-4" />
      <div className="fixed inset-x-0 bottom-0 md:static md:inset-auto bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t md:border-0">
        <div className="max-w-5xl mx-auto px-4 md:px-0 py-3 flex justify-between md:justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => navigate("/publish")}
          >
            Cancelar
          </button>
          <button
            disabled={!selected}
            onClick={handleContinue}
            className={[
              "px-4 py-2 rounded-lg text-white",
              selected ? "bg-gray-900 hover:bg-black" : "bg-gray-400 cursor-not-allowed",
            ].join(" ")}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
