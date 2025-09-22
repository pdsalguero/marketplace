import { useEffect, useState } from "react";
import AdCard from "../components/AdCard";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function Ads() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/ads`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        if (alive) setAds(list);
      } catch (e) {
        if (alive) setErr(e.message || "Error cargando anuncios");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="p-4">Cargando…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      {ads.length === 0 ? (
        <div className="text-gray-500">No hay anuncios.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ads.map(ad => <AdCard key={ad.id} ad={ad} />)}
        </div>
      )}
    </div>
  );
}
