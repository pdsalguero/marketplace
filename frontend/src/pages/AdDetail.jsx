import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ImageGallery from "../components/ImageGallery";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function AdDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  // carga anuncio
  useEffect(() => {
    let alive = true;
    async function loadAd() {
      try {
        const res = await fetch(`${API_URL}/ads/${id}`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!alive) return;
        setAd(data);
      } catch (err) {
        console.error("Error cargando anuncio:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadAd();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded shadow">
        Cargando...
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded shadow">
        <p>No se encontró el anuncio.</p>
        <button
          className="mt-3 bg-gray-200 px-3 py-2 rounded"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
      </div>
    );
  }

  // Usa todas las keys si existen; si no, cae a la key única
  const allKeys = Array.isArray(ad.imageKeys) && ad.imageKeys.length
    ? ad.imageKeys
    : (ad.imageKey ? [ad.imageKey] : []);

  const token = localStorage.getItem("token") || undefined;

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white p-6 rounded shadow space-y-4">
      <h2 className="text-2xl font-bold">{ad.title}</h2>

      {/* Galería de imágenes */}
      <ImageGallery keys={allKeys} token={token} />

      <p className="">{ad.description}</p>

      <p className="text-green-600 font-semibold">
        ${" "}{typeof ad.price === "number" ? ad.price : Number(ad.price || 0)}
      </p>

      <p className="text-sm text-gray-500">
        Publicado por: {ad?.user?.email || ad?.owner?.email || "Desconocido"}
      </p>

      <div className="flex gap-3 pt-2">
        <button
          className="bg-gray-200 px-3 py-2 rounded"
          onClick={() => navigate(-1)}
        >
          Volver
        </button>
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate(`/ads/${id}/edit`)}
        >
          Editar
        </button>
      </div>
    </div>
  );
}
