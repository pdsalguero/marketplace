import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function MultiImageUploader({
  token,
  maxFiles = 8,
  maxSizeMB = 10,
  onChange, // (keys: string[]) => void
}) {
  const [files, setFiles] = useState([]); // {file, key, status, progress}
  const lastKeysRef = useRef([]);

  // Notifica cambios solo si el array de keys realmente cambia
  useEffect(() => {
    const keys = files.map((f) => f.key).filter(Boolean);
    const prev = lastKeysRef.current;
    const changed =
      keys.length !== prev.length || keys.some((k, i) => k !== prev[i]);
    if (changed) {
      lastKeysRef.current = keys;
      if (typeof onChange === "function") onChange(keys);
    }
  }, [files, onChange]);

  const onDrop = useCallback(
    async (accepted) => {
      if (!accepted?.length) return;
      const tooMany = files.length + accepted.length > maxFiles;
      const take = tooMany ? maxFiles - files.length : accepted.length;
      const toAdd = accepted.slice(0, take);

      // 1) pedir presigned batch
      const payload = {
        files: toAdd.map((f) => ({ fileName: f.name, fileType: f.type || "application/octet-stream" })),
      };
      const res = await fetch(`${API_URL}/files/presigned-put-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("presigned batch error", await res.text());
        return;
      }
      const data = await res.json();
      const items = data.items || [];

      // 2) subir cada archivo
      const withMeta = toAdd.map((f, i) => ({
        file: f,
        key: items[i]?.key || null,
        status: "Active",
        progress: 0,
      }));

      setFiles((curr) => [...curr, ...withMeta]);

      await Promise.all(
        withMeta.map(async (entry, i) => {
          if (!items[i]?.uploadURL || !entry.key) {
            entry.status = "error";
            setFiles((curr) => [...curr]);
            return;
          }
          try {
            entry.status = "uploading";
            setFiles((curr) => [...curr]);

            const r = await fetch(items[i].uploadURL, {
              method: "PUT",
              body: entry.file, // no fijar Content-Type manualmente
            });
            if (!r.ok) throw new Error(await r.text());

            entry.status = "done";
            entry.progress = 100;
            setFiles((curr) => [...curr]);
          } catch (e) {
            console.error("upload error", e);
            entry.status = "error";
            setFiles((curr) => [...curr]);
          }
        })
      );
    },
    [API_URL, token, files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: maxSizeMB * 1024 * 1024,
    accept: { "image/*": [] },
  });

  const removeAt = (idx) => {
    setFiles((curr) => curr.filter((_, i) => i !== idx));
  };

  const thumbs = useMemo(
    () =>
      files.map((f, i) => (
        <div key={i} className="relative border rounded overflow-hidden">
          <div className="w-32 h-24 bg-gray-100 grid place-items-center">
            {f.key ? (
              <span className="text-[10px] p-1 text-center break-all">{f.file.name}</span>
            ) : (
              <span className="text-xs text-gray-500">pendiente</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="absolute top-1 right-1 bg-white/80 border rounded px-1 text-xs"
          >
            ×
          </button>
          {f.status === "uploading" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
              <div className="h-1" style={{ width: `${f.progress}%` }} />
            </div>
          )}
        </div>
      )),
    [files]
  );

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded p-4 text-center cursor-pointer ${
          isDragActive ? "bg-blue-50" : "bg-white"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm">
          Arrastra y suelta imágenes aquí o haz click para seleccionar (máx. {maxFiles})
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{thumbs}</div>
    </div>
  );
}
