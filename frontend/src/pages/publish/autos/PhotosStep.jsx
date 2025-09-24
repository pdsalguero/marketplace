import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PhotosStep() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);

  const onFiles = (list) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr].slice(0, 12));
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleNext = async () => {
    const base = JSON.parse(sessionStorage.getItem("publishDraft") || "{}");
    const urls = await Promise.all(files.map(fileToDataUrl));
    sessionStorage.setItem("publishDraft", JSON.stringify({ ...base, photos: urls }));
    navigate("/publish/autos/precio");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 bg-gray-50 text-center">
        <p className="mb-2 font-medium">Subí hasta 12 fotos</p>
        <p className="text-sm text-gray-500 mb-4">Arrastrá y soltá, o seleccioná desde tu dispositivo.</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        <button className="px-4 py-2 rounded-lg border hover:bg-white" onClick={() => inputRef.current?.click()}>
          Elegir imágenes
        </button>

        {!!files.length && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
            {files.map((f, i) => (
              <div key={i} className="aspect-square bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex items-center justify-center text-[11px] text-gray-600">
                <span className="px-2 text-center truncate">{f.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between md:justify-end gap-3">
        <button className="px-4 py-2 rounded-lg border border-gray-300" onClick={() => navigate(-1)}>
          Atrás
        </button>
        <button
          disabled={!files.length}
          className={["px-4 py-2 rounded-lg text-white", files.length ? "bg-gray-900 hover:bg-black" : "bg-gray-400 cursor-not-allowed"].join(" ")}
          onClick={handleNext}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
