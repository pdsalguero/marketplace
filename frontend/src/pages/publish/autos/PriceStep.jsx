import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PriceStep() {
  const navigate = useNavigate();
  const [price, setPrice] = useState("");

  const handleNext = () => {
    const base = JSON.parse(sessionStorage.getItem("publishDraft") || "{}");
    sessionStorage.setItem("publishDraft", JSON.stringify({ ...base, price: price ? Number(price) : undefined }));
    navigate("/publish/autos/revision");
  };

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
        <div className="flex items-center gap-2">
          <span className="px-3 py-2 border rounded-xl bg-gray-100 text-gray-700">$</span>
          <input
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100"
            type="number"
            min="0"
            step="1000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ej: 5.000.000"
          />
        </div>
      </div>

      <div className="flex justify-between md:justify-end gap-3">
        <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={() => navigate(-1)}>
          Atrás
        </button>
        <button
          disabled={!price}
          className={["px-4 py-2 rounded-lg text-white", price ? "bg-gray-900 hover:bg-black" : "bg-gray-400 cursor-not-allowed"].join(" ")}
          onClick={handleNext}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
