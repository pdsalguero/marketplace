import { useEffect, useMemo, useRef, useState } from "react";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function ImageGallery({ keys = [], token }) {
  const [items, setItems] = useState([]); // [{ key, url }]
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  const auth = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  // Cargar URLs presignadas para cada key
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        setLoading(true);
        const results = await Promise.all(
          keys.map(async (key) => {
            const res = await fetch(
              `${API_URL}/files/presigned-get?key=${encodeURIComponent(key)}`,
              { headers: { ...auth } }
            );
            if (!res.ok) throw new Error(await res.text());
            const { url } = await res.json();
            return { key, url };
          })
        );
        if (!alive) return;
        setItems(results);
        setActive(0);
      } catch (e) {
        console.error("gallery fetch error", e);
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (keys?.length) load();
    else {
      setItems([]);
      setLoading(false);
    }
    return () => {
      alive = false;
    };
  }, [keys, auth]);

  // Navegación por teclado: ← → Home End
  useEffect(() => {
    function onKey(e) {
      if (!items.length) return;
      if (["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(items.length - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, active]);

  function go(i) {
    const n = items.length;
    if (n === 0) return;
    const clamped = Math.max(0, Math.min(i, n - 1));
    setActive(clamped);
    // centrar miniatura seleccionada
    const el = containerRef.current?.querySelector(`[data-idx="${clamped}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }
  function next() { go((active + 1) % (items.length || 1)); }
  function prev() { go((active - 1 + (items.length || 1)) % (items.length || 1)); }

  async function refreshOne(idx) {
    try {
      const key = items[idx]?.key;
      if (!key) return;
      const res = await fetch(
        `${API_URL}/files/presigned-get?key=${encodeURIComponent(key)}`,
        { headers: { ...auth } }
      );
      if (!res.ok) return;
      const { url } = await res.json();
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, url } : it)));
    } catch {}
  }

  if (loading) {
    return <div className="w-full h-64 bg-gray-100 animate-pulse rounded" />;
  }
  if (!items.length) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-sm">
        Sin imágenes
      </div>
    );
  }

  const canSlide = items.length > 1;

  return (
    <div className="w-full" role="region" aria-label="Galería de imágenes">
      {/* Imagen principal + flechas */}
      <div className="relative w-full mb-3 select-none">
        <img
          src={items[active]?.url}
          alt={`img-${active}`}
          className="w-full max-h-[480px] object-contain bg-gray-50 rounded"
          onError={() => refreshOne(active)}
        />

        {canSlide && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Anterior"
              className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/50 text-white w-9 h-9 rounded-full grid place-items-center"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Siguiente"
              className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/50 text-white w-9 h-9 rounded-full grid place-items-center"
            >
              ›
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
              {active + 1}/{items.length}
            </div>
          </>
        )}
      </div>

      {/* Miniaturas */}
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-1"
        role="listbox"
        aria-label="Miniaturas"
      >
        {items.map((it, i) => (
          <button
            key={it.key}
            type="button"
            data-idx={i}
            onClick={() => go(i)}
            role="option"
            aria-selected={i === active}
            className={`flex-shrink-0 w-20 h-20 rounded border ${
              i === active ? "ring-2 ring-blue-600" : "border-gray-200"
            } bg-white`}
            title={it.key.split("/").slice(-1)[0]}
          >
            <img
              src={it.url}
              alt={`thumb-${i}`}
              className="w-full h-full object-cover rounded"
              onError={() => refreshOne(i)}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
