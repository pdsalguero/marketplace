import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function Publish() {
  const [cats, setCats] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/categories`);
        const d = await r.json();
        if (!alive) return;
        setCats(Array.isArray(d.items) ? d.items : []);
      } catch {
        if (alive) setCats([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const go = (cat) => {
    if (cat.code === "AUTOS") navigate("/publish/autos");
    else navigate(`/publish/${cat.slug}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Publicar — elige una categoría</h1>
      {cats.length === 0 ? (
        <div className="text-gray-500">Cargando categorías…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cats.map((c) => (
            <button
              key={c.slug}
              onClick={() => go(c)}
              className="border rounded-lg p-4 bg-white hover:shadow transition flex items-center gap-3 text-left"
            >
              <div className="text-2xl" aria-hidden>{c.icon || "📦"}</div>
              <div>
                <div className="font-semibold">{c.label}</div>
                <div className="text-xs text-gray-500 capitalize">{c.slug}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
