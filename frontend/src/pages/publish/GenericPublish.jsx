import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CreateAd from "../CreateAd";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function GenericPublish() {
  const { slug } = useParams(); // ej: "inmuebles", "electronica", ...
  const [cat, setCat] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/categories`);
        const d = await r.json();
        const match = (d.items || []).find((c) => c.slug === slug);
        if (alive) setCat(match || null);
      } catch {
        if (alive) setCat(null);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  if (!cat) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-xl font-semibold">Categoría no encontrada</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Publicar — {cat.label}</h1>
      {/* Bloqueamos el select de categoría en CreateAd pasando defaultCategory */}
      <CreateAd defaultCategory={cat.code} />
    </div>
  );
}
