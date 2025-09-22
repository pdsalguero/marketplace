import { useEffect, useState } from "react";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function CategoryGrid() {
  const [cats, setCats] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/categories`);
        const d = await r.json();
        if (alive) setCats(Array.isArray(d.items) ? d.items : []);
      } catch {
        if (alive) setCats([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!cats.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {cats.map((c) => (
        <a
          key={c.slug}
          href={`/?category=${encodeURIComponent(c.code)}`}
          className="border rounded-lg p-4 bg-white hover:shadow transition flex items-center gap-3"
        >
          <div className="text-2xl" aria-hidden>
            {c.icon || "📦"}
          </div>
          <div>
            <div className="font-semibold">{c.label}</div>
            <div className="text-xs text-gray-500 capitalize">{c.slug}</div>
          </div>
        </a>
      ))}
    </div>
  );
}
