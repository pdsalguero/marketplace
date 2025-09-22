import { useEffect, useState } from "react";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function AdCard({ ad }) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    let alive = true;
    const keys = Array.isArray(ad.imageKeys) && ad.imageKeys.length
      ? ad.imageKeys
      : (ad.imageKey ? [ad.imageKey] : []);
    const key = keys[0];
    async function load() {
      try {
        if (!key) return;
        const r = await fetch(`${API_URL}/files/presigned-get?key=${encodeURIComponent(key)}`);
        if (!r.ok) throw new Error(await r.text());
        const { url } = await r.json();
        if (alive) setImg(url);
      } catch {
        if (alive) setImg(null);
      }
    }
    load();
    return () => { alive = false; };
  }, [ad.imageKey, ad.imageKeys]);

  return (
    <a href={`/ads/${ad.id}`} className="block border rounded-lg overflow-hidden hover:shadow-md transition">
      <div className="w-full h-48 bg-gray-100 grid place-items-center">
        {img ? (
          <img src={img} alt={ad.title} className="w-full h-48 object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">Sin imagen</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold line-clamp-1">{ad.title}</h3>
          <div className="text-green-600 font-bold whitespace-nowrap">
            ${typeof ad.price === "number" ? ad.price.toLocaleString() : Number(ad.price || 0).toLocaleString()}
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{ad.description}</p>
        <div className="text-xs text-gray-400 mt-2">
          Publicado {new Date(ad.createdAt).toLocaleDateString()}
        </div>
      </div>
    </a>
  );
}
