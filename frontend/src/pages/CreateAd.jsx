import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:4001/api";

export default function CreateAd() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Debes iniciar sesión para crear un anuncio");
      return;
    }

    try {
      let imageKey = null;

      // 1️⃣ Si hay archivo, pedimos presigned URL al backend
      if (file) {
        console.log("🔹 Subiendo archivo:", file.name);

        const presignedRes = await fetch(
          `${API_URL}/ads/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${file.type}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!presignedRes.ok) {
          throw new Error("Error obteniendo presigned URL");
        }

        const { uploadURL, key } = await presignedRes.json();
       

        // 2️⃣ Subimos el archivo a MinIO usando la URL firmada
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        imageKey = key;
        
        if (!uploadRes.ok) {
          throw new Error("Error al subir la imagen a MinIO");
        }

        console.log("✅ Imagen subida a MinIO:", key);
      }

      // 3️⃣ Creamos el anuncio en el backend
      const res = await fetch(`${API_URL}/ads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          price,
          imageKey, // 👈 guardamos referencia a la imagen
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Error creando anuncio");
      }

      const ad = await res.json();
      console.log("✅ Anuncio creado:", ad);

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
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Crear anuncio
        </button>
      </form>
    </div>
  );
}
