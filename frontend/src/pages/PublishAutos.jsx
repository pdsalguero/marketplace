import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MultiImageUploader from "../components/MultiImageUploader";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function CreateAd({ defaultCategory }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageKeys, setImageKeys] = useState([]);
  const [category, setCategory] = useState(defaultCategory || "OTROS");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión para crear un anuncio");

    try {
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
          imageKey: imageKeys[0] || null,
          imageKeys,
          category, // ⬅️ importante
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

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Crear nuevo anuncio</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <select
            className="w-full border p-2 rounded"
            value={category}
            onChange={(e)=>setCategory(e.target.value)}
            disabled={!!defaultCategory}
          >
            <option value="AUTOS">Autos</option>
            <option value="INMUEBLES">Inmuebles</option>
            <option value="ELECTRONICA">Electrónica</option>
            <option value="HOGAR">Hogar</option>
            <option value="EMPLEO">Empleo</option>
            <option value="SERVICIOS">Servicios</option>
            <option value="MODA">Moda</option>
            <option value="MASCOTAS">Mascotas</option>
            <option value="OTROS">Otros</option>
          </select>
        </div>

        <input className="w-full border p-2 rounded" placeholder="Título" value={title}
          onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="w-full border p-2 rounded" placeholder="Descripción" value={description}
          onChange={(e) => setDescription(e.target.value)} required />
        <input type="number" className="w-full border p-2 rounded" placeholder="Precio" value={price}
          onChange={(e) => setPrice(e.target.value)} required />

        <MultiImageUploader token={localStorage.getItem("token") || undefined}
          maxFiles={8} maxSizeMB={10} onChange={setImageKeys} />

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Publicar
        </button>
      </form>
    </div>
  );
}
