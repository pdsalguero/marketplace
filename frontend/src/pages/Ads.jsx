import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";


const API_URL = import.meta.env.VITE_API_URL;

function Ads() {
  const [ads, setAds] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/ads`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar anuncios");
        return res.json();
      })
      .then((data) => setAds(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-red-500">❌ {error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Anuncios</h2>
      {ads.length === 0 ? (
        <p className="text-gray-500">No hay anuncios todavía.</p>
      ) : (
        <ul className="space-y-4">
      {ads.map((ad) => (
        <div key={ad.id} className="border p-4 rounded-md shadow-md">
          <Link to={`/ads/${ad.id}`} className="text-xl font-bold text-blue-600">
            {ad.title}
          </Link>
          <p>{ad.description}</p>
          <p className="font-semibold">${ad.price}</p>
        </div>
      ))}
        </ul>
      )}
    </div>
  );
}

export default Ads;
