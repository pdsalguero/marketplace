import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MultiImageUploader from "../components/MultiImageUploader";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function CreateAd() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageKeys, setImageKeys] = useState([]); // ⬅️ ahora múltiples
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión para crear un anuncio");

    try {
      // Enviar imageKeys (y imageKey[0] por compatibilidad)
      const res = await fetch(`${API_URL}/ads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          imageKey: imageKeys[0] || null, // compat
          imageKeys,                       // nuevo
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      await res.json();
      navigate("/ads");
    } catch (err) {
      console.error("❌ Error en CreateAd:", err);
      alert(err.message);
    }
  };

  const token = localStorage.getItem("token") || undefined;

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Crear nuevo anuncio</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <textarea
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="number"
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        {/* ⬇️ Módulo de subida múltiple */}
        <MultiImageUploader
          token={token}
          maxFiles={8}
          maxSizeMB={10}
          onChange={(keys) => setImageKeys(keys)}
        />

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Crear anuncio
        </button>
      </form>
    </div>
  );
}
