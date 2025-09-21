import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:4001/api/users/me/ads", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setAds(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando anuncios del usuario:", err);
        setLoading(false);
      });
  }, []);

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold">Debes iniciar sesión</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Perfil de {user.name || user.email}</h2>

      {loading ? (
        <p>Cargando tus anuncios...</p>
      ) : ads.length === 0 ? (
        <p>No tienes anuncios publicados todavía.</p>
      ) : (
        <ul className="space-y-4">
          {ads.map((ad) => (
            <li
              key={ad.id}
              className="p-4 border rounded shadow flex justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold">{ad.title}</h3>
                <p className="text-gray-600">{ad.description}</p>
                <p className="font-bold">${ad.price}</p>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(ad.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
