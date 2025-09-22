import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function MultiImageUploader({
  token,
  initialKeys = [],
  maxFiles = 8,
  maxSizeMB = 10,
  onChange, // (keys: string[]) => void
}) {
  const [items, setItems] = useState(() =>
    initialKeys.map((k) => ({ id: k, key: k, status: "done", progress: 100, preview: null }))
  );
  const uploadingRef = useRef(false);

  // Notifica claves al padre
  useEffect(() => {
    const keys = items.filter((x) => x.status === "done").map((x) => x.key);
    onChange?.(keys);
  }, [items, onChange]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (uploadingRef.current) return;
      const remain = Math.max(0, maxFiles - items.length);
      const files = acceptedFiles.slice(0, remain);

      // 1) agrega a la UI como pendientes
      const pending = files.map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: "queued", // queued -> uploading -> done/error
        progress: 0,
        preview: URL.createObjectURL(f),
      }));
      setItems((prev) => [...prev, ...pending]);

      // 2) pide presign en batch
      try {
        uploadingRef.current = true;
        const body = {
          files: pending.map((p) => ({ fileName: p.file.name, fileType: p.file.type })),
        };
        const res = await fetch(`${API_URL}/files/presigned-put-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        const { items: presigned } = await res.json();

        // 3) sube cada archivo con XHR para progreso
        await Promise.all(
          pending.map(async (p, idx) => {
            const match = presigned[idx];
            if (!match) throw new Error("presign response mismatch");
            await uploadWithProgress(p.file, match.uploadURL, (prog) => {
              setItems((prev) =>
                prev.map((x) => (x.id === p.id ? { ...x, status: "uploading", progress: prog } : x))
              );
            });
            // listo
            setItems((prev) =>
              prev.map((x) =>
                x.id === p.id ? { ...x, status: "done", progress: 100, key: match.key } : x
              )
            );
          })
        );
      } catch (err) {
        console.error("upload error", err);
        setItems((prev) =>
          prev.map((x) => (x.status === "queued" || x.status === "uploading" ? { ...x, status: "error" } : x))
        );
      } finally {
        uploadingRef.current = false;
      }
    },
    [items.length, maxFiles, token]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  const removeItem = (id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const cards = useMemo(
    () =>
      items.map((it) => (
        <div key={it.id} className="relative w-28 h-28 rounded overflow-hidden border bg-white">
          {it.preview ? (
            <img src={it.preview} alt="" className="w-full h-full object-cover" />
          ) : it.key ? (
            <div className="w-full h-full text-xs p-2 break-words">{it.key.split("/").slice(-1)}</div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">pendiente</div>
          )}

          {it.status !== "done" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div className="h-full" style={{ width: `${it.progress}%` }} />
            </div>
          )}
          <button
            type="button"
            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded"
            onClick={() => removeItem(it.id)}
          >
            ✕
          </button>
          {it.status === "error" && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center text-xs text-red-700">
              error
            </div>
          )}
        </div>
      )),
    [items]
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Imágenes (máx. {maxFiles})</label>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-4 text-center cursor-pointer ${
          isDragActive ? "border-blue-600 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-600">
          Arrastra imágenes aquí o <span className="text-blue-600 underline">haz clic para seleccionar</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP • máx {maxSizeMB}MB c/u</p>
      </div>

      {items.length > 0 && <div className="flex flex-wrap gap-2">{cards}</div>}
    </div>
  );
}

function uploadWithProgress(file, url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded * 100) / e.total));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(true);
      else reject(new Error(`PUT ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });
}
