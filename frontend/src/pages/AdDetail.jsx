import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function AdDetail() {
  const { id } = useParams();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch(`${API_URL}/ads/${id}`);
        if (!res.ok) throw new Error("Error cargando anuncio");
        const data = await res.json();
        setAd(data);
      } catch (err) {
        console.error("❌ Error en fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [id]);

  if (loading) return <p className="text-center mt-6">Cargando...</p>;
  if (!ad) return <p className="text-center mt-6">Anuncio no encontrado</p>;

  // URL pública de MinIO (ajusta si tu bucket es privado o distinto)
  const imageUrl = ad.imageKey
    ? `http://localhost:9000/marketplace/${ad.imageKey}`
    : null;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded mt-6">
      <h1 className="text-2xl font-bold mb-4">{ad.title}</h1>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={ad.title}
          className="w-full h-64 object-cover rounded mb-4"
        />
      )}
      <p className="text-gray-700 mb-2">{ad.description}</p>
      <p className="text-lg font-semibold text-green-600 mb-4">
        💲 {ad.price}
      </p>
      <p className="text-sm text-gray-500">
        Publicado por: {ad.user?.email || `Usuario ${ad.userId}`}
      </p>

      <div className="flex gap-4 mt-6">
        <Link
          to="/ads"
          className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
        >
          Volver
        </Link>
        <button
          onClick={() => navigate(`/ads/${id}/edit`)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Editar
        </button>
      </div>
    </div>
  );
}
