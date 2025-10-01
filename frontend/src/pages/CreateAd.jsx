import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function classNames(...c) { return c.filter(Boolean).join(" "); }

const STEPS = [
  { key: "category", label: "Categoría", description: "Elegí dónde publicar" },
  { key: "details", label: "Detalles", description: "Título, estado, precio y ubicación" },
  { key: "photos", label: "Fotos", description: "Imágenes del producto" },
  { key: "review", label: "Revisar y publicar" },
];

function Stepper({ current, onStepClick }) {
  const pct = (current / (STEPS.length - 1)) * 100;
  return (
    <nav className="w-full" aria-label="Breadcrumb">
      <div className="relative py-4">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-700 transition-all" style={{ width: `${pct}%` }} />
        <ol className="relative z-10 grid grid-cols-4">
          {STEPS.map((s, idx) => {
            const isDone = idx < current, isCurrent = idx === current;
            return (
              <li key={s.key} className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(idx)}
                  className={classNames(
                    "flex h-10 w-10 items-center justify-center rounded-full border text-sm transition",
                    isCurrent ? "border-gray-900 bg-gray-900 text-white shadow"
                              : isDone ? "border-gray-600 bg-white text-gray-900 shadow"
                                       : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  title={`${idx + 1}`}
                >
                  {isDone ? "✓" : idx + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function StepHeader({ index }) {
  const s = STEPS[index];
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold leading-tight">{s.label}</h2>
      {s.description && <p className="text-sm text-gray-600">{s.description}</p>}
    </div>
  );
}

function Field({ label, children, error, required }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-700 font-medium">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ============ Dropzone + Galería con reordenado ============ */
const MAX_FILES = 10;
const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function DropzoneGallery({ images, setImages }) {
  const inputRef = useRef(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const dragItem = useRef(null); // id del item que se arrastra

  const addFiles = (fileList) => {
    const next = [];
    for (const f of Array.from(fileList || [])) {
      if (!f.type?.startsWith("image/")) continue;
      next.push({ id: genId(), file: f, preview: URL.createObjectURL(f), name: f.name, type: f.type });
    }
    if (!next.length) return;
    const merged = [...images, ...next].slice(0, MAX_FILES);
    setImages(merged);
  };

  const onInput = (e) => addFiles(e.target.files);
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDraggingOver(false);
    addFiles(e.dataTransfer.files);
  };
  const onDragOver = (e) => { e.preventDefault(); setDraggingOver(true); };
  const onDragLeave = () => setDraggingOver(false);

  const removeAt = (id) => {
    const item = images.find((i) => i.id === id);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    setImages(images.filter((i) => i.id !== id));
  };

  // DnD reordenado
  const onThumbDragStart = (id) => (e) => {
    dragItem.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const onThumbDrop = (targetId) => (e) => {
    e.preventDefault();
    const sourceId = dragItem.current;
    if (!sourceId || sourceId === targetId) return;
    const srcIdx = images.findIndex((i) => i.id === sourceId);
    const tgtIdx = images.findIndex((i) => i.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const copy = images.slice();
    const [moved] = copy.splice(srcIdx, 1);
    copy.splice(tgtIdx, 0, moved);
    setImages(copy);
    dragItem.current = null;
  };

  return (
    <div className="space-y-3">
      <div
        className={classNames(
          "rounded-2xl border-2 border-dashed p-6 text-center transition",
          draggingOver ? "border-gray-900 bg-gray-50" : "border-gray-300"
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      >
        <div className="text-sm text-gray-700">Arrastrá imágenes aquí o <span className="underline">hacé click</span> para seleccionar</div>
        <div className="text-xs text-gray-500 mt-1">Hasta {MAX_FILES} imágenes</div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onInput} />
      </div>

      {!!images.length && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative group rounded-xl overflow-hidden border"
              draggable
              onDragStart={onThumbDragStart(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onThumbDrop(img.id)}
              title="Arrastrar para reordenar"
            >
              <img src={img.preview} alt={img.name} className="aspect-video w-full object-cover" />
              <div className="absolute left-2 top-2 bg-white/90 rounded px-2 text-xs font-medium">{idx + 1}</div>
              <button
                type="button"
                onClick={() => removeAt(img.id)}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2 text-xs opacity-0 group-hover:opacity-100 transition"
                title="Quitar"
              >
                ×
              </button>
              <div className="absolute inset-0 pointer-events-none group-hover:outline group-hover:outline-2 group-hover:outline-gray-700/50 rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =================== Página =================== */
export default function AdCreate() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  // categorías
  const [catsL1, setCatsL1] = useState([]), [catsL2, setCatsL2] = useState([]), [catsL3, setCatsL3] = useState([]);
  const [selL1, setSelL1] = useState(""), [selL2, setSelL2] = useState(""), [selL3, setSelL3] = useState("");
  const [loadingCats, setLoadingCats] = useState(true), [loadingSub1, setLoadingSub1] = useState(false), [loadingSub2, setLoadingSub2] = useState(false);

  // ubicación
  const [provs, setProvs] = useState([]), [cities, setCities] = useState([]);
  const [loadingProvs, setLoadingProvs] = useState(true), [loadingCities, setLoadingCities] = useState(false);

  // imágenes (para previews/reordenado)
  const [images, setImages] = useState([]); // [{id,file,preview,name,type}]
  const [uploading, setUploading] = useState(false);

  // form/estado
  const [saving, setSaving] = useState(false), [msg, setMsg] = useState(""), [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: "", description: "", price: "", currency: "ARS", condition: "new",
    categorySlug: "", provinceSlug: "", citySlug: "",
  });

  const onChange = (k) => (e) => {
    const v = e?.target?.value ?? e;
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((pe) => ({ ...pe, [k]: "" }));
    setMsg("");
  };

  // cargar listas
  useEffect(() => { (async () => {
    try { const r = await fetch("/api/categories"); setCatsL1(r.ok ? await r.json() : []); }
    catch { setCatsL1([]); } finally { setLoadingCats(false); }
  })(); (async () => {
    try {
      const rp = await fetch("/api/locations/provinces"); const dp = rp.ok ? await rp.json() : { items: [] };
      setProvs(Array.isArray(dp.items) ? dp.items : Array.isArray(dp) ? dp : []);
    } catch { setProvs([]); } finally { setLoadingProvs(false); }
  })(); }, []);

  useEffect(() => {
    setSelL2(""); setSelL3(""); setCatsL2([]); setCatsL3([]);
    if (!selL1) return;
    (async () => { setLoadingSub1(true);
      try { const r = await fetch(`/api/categories/${encodeURIComponent(selL1)}/children`); setCatsL2(r.ok ? await r.json() : []); }
      catch { setCatsL2([]); } finally { setLoadingSub1(false); }
    })();
  }, [selL1]);

  useEffect(() => {
    setSelL3(""); setCatsL3([]);
    if (!selL2) return;
    (async () => { setLoadingSub2(true);
      try { const r = await fetch(`/api/categories/${encodeURIComponent(selL2)}/children`); setCatsL3(r.ok ? await r.json() : []); }
      catch { setCatsL3([]); } finally { setLoadingSub2(false); }
    })();
  }, [selL2]);

  useEffect(() => {
    const slug = selL3 || selL2 || selL1 || "";
    setForm((f) => (f.categorySlug === slug ? f : { ...f, categorySlug: slug }));
    if (errors.categorySlug && slug) setErrors((e) => ({ ...e, categorySlug: "" }));
  }, [selL1, selL2, selL3]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!form.provinceSlug) { setCities([]); setForm((f) => ({ ...f, citySlug: "" })); return; }
      setLoadingCities(true);
      try {
        const r = await fetch(`/api/locations/cities?provinceSlug=${encodeURIComponent(form.provinceSlug)}`);
        const d = r.ok ? await r.json() : { items: [] };
        const list = Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [];
        if (!abort) {
          setCities(list);
          if (!list.some((c) => c.slug === form.citySlug)) setForm((f) => ({ ...f, citySlug: "" }));
        }
      } catch { if (!abort) { setCities([]); setForm((f) => ({ ...f, citySlug: "" })); } }
      finally { if (!abort) setLoadingCities(false); }
    })();
    return () => { abort = true; };
  }, [form.provinceSlug]);

  const validate = () => {
    const e = {};
    if (!form.categorySlug) e.categorySlug = "Categoría requerida";
    if (!form.title?.trim()) e.title = "Título requerido";
    const priceNum = Number(String(form.price).replace(",", "."));
    if (!(priceNum > 0)) e.price = "Precio inválido";
    if (!["new", "used"].includes(form.condition)) e.condition = "Condición requerida";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // === Helpers de compresión ===
const readAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const loadImageEl = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

function renameWithExt(name, ext) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}.${ext}`;
}

/**
 * Comprime a JPEG manteniendo proporción (máx. 1600x1600).
 * Retorna un File. Si falla o no mejora, devuelve el original.
 */
async function compressImage(file, {
  maxW = 1600,
  maxH = 1600,
  quality = 0.82,
  convertTo = "image/jpeg",
} = {}) {
  try {
    // Si no es imagen, devolver original
    if (!file.type?.startsWith("image/")) return file;

    const dataUrl = await readAsDataURL(file);
    const img = await loadImageEl(dataUrl);

    // Si ya está dentro de límites, sólo re-encodea si es beneficioso
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const outW = Math.max(1, Math.round(img.width * scale));
    const outH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, outW, outH);

    // Para PNG/GIF/HEIC, convertimos a JPEG
    const targetType = convertTo || (file.type.startsWith("image/jpeg") ? "image/jpeg" : "image/jpeg");

    const blob = await canvasToBlob(canvas, targetType, quality);
    if (!blob) return file;

    // Si quedó más grande, usa original
    const out = blob.size < file.size
      ? new File([blob], renameWithExt(file.name, "jpg"), { type: targetType, lastModified: Date.now() })
      : file;

    return out;
  } catch {
    return file;
  }
}

  // subir imágenes según tu backend (files: [{fileName,fileType}]) con compresión previa
const uploadAll = async () => {
  if (!images.length) return [];
  setUploading(true);
  try {
    // 1) Comprimir en el orden actual
    const compressed = [];
    for (const it of images) {
      const cf = await compressImage(it.file, { maxW: 1600, maxH: 1600, quality: 0.82, convertTo: "image/jpeg" });
      compressed.push(cf);
    }

    // 2) Pedir prefirmas con el tipo final
    const reqFiles = compressed.map((f) => ({
      fileName: f.name || "upload.jpg",
      fileType: f.type || "image/jpeg",
    }));

    const pres = await fetch("/api/files/presigned-put-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
      body: JSON.stringify({ files: reqFiles }),
    });

    const raw = await pres.text();
    if (!pres.ok) {
      let detail = raw; try { const j = JSON.parse(raw); detail = j?.error || j?.message || raw; } catch {}
      throw new Error(`Error al solicitar URLs (${pres.status}): ${detail}`);
    }
    const data = JSON.parse(raw);
    const items = Array.isArray(data?.items) ? data.items : [];
    if (!items.length) throw new Error("Respuesta de pre-firma vacía");

    // 3) Subir cada comprimido a su uploadURL manteniendo el orden
    const results = [];
    for (let i = 0; i < compressed.length; i++) {
      const f = compressed[i];
      const it = items[i];
      const putURL = it?.uploadURL, key = it?.key;
      if (!putURL || !key) throw new Error("Estructura inesperada (falta uploadURL/key)");

      const r = await fetch(putURL, {
        method: "PUT",
        body: f,
        headers: { "Content-Type": f.type || "image/jpeg" },
      });
      if (!r.ok) throw new Error(`Fallo subiendo ${f.name} (${r.status})`);

      results.push({ key, url: it?.url });
    }
    return results;
  } finally {
    setUploading(false);
  }
};


  const doSubmit = async () => {
    setMsg(""); if (!validate()) return; if (!token) { setMsg("Necesitas iniciar sesión"); return; }
    try {
      setSaving(true);
      let uploaded = images.length ? await uploadAll() : [];
      const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BUCKET_BASE; // ej: http://localhost:9000/marketplace
      const base = typeof PUBLIC_BASE === "string" ? PUBLIC_BASE.replace(/\/+$/, "") : "";

      const media = uploaded.map((u, idx) => {
        const finalUrl = u?.url || (base ? `${base}/${u.key}` : null);
        if (!finalUrl) throw new Error("No se pudo resolver la URL pública. Configurá VITE_PUBLIC_BUCKET_BASE o hace que /api/files/presigned-put-batch devuelva 'url'.");
        return { url: finalUrl, position: idx };
      });

      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        price: Number(String(form.price).replace(",", ".")),
        categorySlug: form.categorySlug || undefined,
        provinceSlug: form.provinceSlug || undefined,
        citySlug: form.citySlug || undefined,
        condition: form.condition,
        media,
      };

      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let m = `Error ${res.status}`; try { const j = await res.json(); m = j?.error || j?.message || m; } catch {}
        throw new Error(m);
      }
      navigate("/account/listings");
    } catch (err) { setMsg(err?.message || "No se pudo crear el anuncio"); }
    finally { setSaving(false); }
  };

  const stepCanAdvance = (i) => {
    if (i === 0) return !!form.categorySlug;
    if (i === 1) return !!form.title && ["new", "used"].includes(form.condition) && Number(String(form.price).replace(",", ".")) > 0;
    if (i === 2) return true; // fotos opcionales
    return true;
  };

  const priceHelp = useMemo(() => {
    const n = Number(String(form.price).replace(",", "."));
    if (!(n > 0)) return "";
    return n.toLocaleString(undefined, { style: "currency", currency: form.currency || "USD", maximumFractionDigits: 0 });
  }, [form.price, form.currency]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Publicar anuncio</h1>

      <StepperWrapper>
        {(step, setStep) => (
          <form
            onSubmit={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (step < STEPS.length - 1) { e.preventDefault(); if (stepCanAdvance(step)) setStep(step + 1); }
                else { e.preventDefault(); doSubmit(); }
              }
            }}
            className="mt-4 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
          >
            <StepHeader index={step} />

            {/* Paso 0: Categoría */}
            {step === 0 && (
              <section className="grid gap-4 md:grid-cols-3">
                <Field label="Categoría" error={errors.categorySlug} required>
                  <select className="w-full border rounded-xl px-3 py-2" value={selL1} onChange={(e) => setSelL1(e.target.value)} disabled={loadingCats}>
                    <option value="">{loadingCats ? "Cargando…" : "Selecciona categoría"}</option>
                    {catsL1.map((c) => (<option key={c.id || c.slug} value={c.slug}>{c.name}</option>))}
                  </select>
                </Field>

                <Field label="Subcategoría">
                  <select className="w-full border rounded-xl px-3 py-2" value={selL2} onChange={(e) => setSelL2(e.target.value)} disabled={!selL1 || loadingSub1}>
                    <option value="">{!selL1 ? "Selecciona categoría primero" : (loadingSub1 ? "Cargando…" : "(opcional)")}</option>
                    {catsL2.map((c) => (<option key={c.id || c.slug} value={c.slug}>{c.name}</option>))}
                  </select>
                </Field>

                <Field label="Sub-subcategoría">
                  <select className="w-full border rounded-xl px-3 py-2" value={selL3} onChange={(e) => setSelL3(e.target.value)} disabled={!selL2 || loadingSub2}>
                    <option value="">{!selL2 ? "Selecciona subcategoría primero" : (loadingSub2 ? "Cargando…" : "(opcional)")}</option>
                    {catsL3.map((c) => (<option key={c.id || c.slug} value={c.slug}>{c.name}</option>))}
                  </select>
                </Field>
              </section>
            )}

            {/* Paso 1: Detalles */}
            {step === 1 && (
              <section className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Título" error={errors.title} required>
                    <input className="w-full border rounded-xl px-3 py-2" value={form.title} onChange={onChange("title")} placeholder="Ej: Toyota Corolla 2018" />
                  </Field>
                  <Field label="Condición" error={errors.condition} required>
                    <select className="w-full border rounded-xl px-3 py-2" value={form.condition} onChange={onChange("condition")}>
                      <option value="new">Nuevo</option>
                      <option value="used">Usado</option>
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                  <Field label="Precio" error={errors.price} required>
                    <input className="w-full border rounded-xl px-3 py-2" type="number" min="0" value={form.price} onChange={onChange("price")} placeholder="Ej: 12000" />
                    {priceHelp && <div className="text-xs text-gray-500">{priceHelp}</div>}
                  </Field>
                  <Field label="Moneda">
                    <select className="w-full border rounded-xl px-3 py-2" value={form.currency} onChange={onChange("currency")}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Provincia">
                    <select className="w-full border rounded-xl px-3 py-2" value={form.provinceSlug} onChange={onChange("provinceSlug")} disabled={loadingProvs}>
                      <option value="">{loadingProvs ? "Cargando…" : "Selecciona provincia (opcional)"}</option>
                      {provs.map((p) => (<option key={p.id} value={p.slug}>{p.name}</option>))}
                    </select>
                  </Field>

                  <Field label="Ciudad">
                    <select className="w-full border rounded-xl px-3 py-2" value={form.citySlug} onChange={onChange("citySlug")} disabled={!form.provinceSlug || loadingCities}>
                      <option value="">{!form.provinceSlug ? "Selecciona provincia primero" : (loadingCities ? "Cargando…" : "Selecciona ciudad (opcional)")}</option>
                      {cities.map((c) => (<option key={c.id} value={c.slug}>{c.name}</option>))}
                    </select>
                  </Field>
                </div>

                <Field label="Descripción">
                  <textarea className="w-full border rounded-xl px-3 py-2" rows={4} value={form.description} onChange={onChange("description")} placeholder="Detalles, estado, kilometraje, etc." />
                </Field>
              </section>
            )}

            {/* Paso 2: Fotos (con drag&drop + reordenar) */}
            {step === 2 && (
              <section className="space-y-2">
                <div className="text-sm text-gray-600">Subí hasta {MAX_FILES} imágenes</div>
                <DropzoneGallery images={images} setImages={setImages} />
                {uploading && <div className="text-sm text-gray-500">Subiendo imágenes…</div>}
              </section>
            )}

            {/* Paso 3: Revisar y publicar */}
            {step === 3 && (
              <section>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><dt className="text-xs uppercase text-gray-500">Categoría</dt><dd className="font-medium">{form.categorySlug || "-"}</dd></div>
                  <div><dt className="text-xs uppercase text-gray-500">Título</dt><dd className="font-medium">{form.title || "-"}</dd></div>
                  <div><dt className="text-xs uppercase text-gray-500">Condición</dt><dd className="font-medium">{form.condition}</dd></div>
                  <div><dt className="text-xs uppercase text-gray-500">Precio</dt><dd className="font-medium">{form.currency} {form.price || "-"}</dd></div>
                  <div><dt className="text-xs uppercase text-gray-500">Provincia</dt><dd className="font-medium">{form.provinceSlug || "-"}</dd></div>
                  <div><dt className="text-xs uppercase text-gray-500">Ciudad</dt><dd className="font-medium">{form.citySlug || "-"}</dd></div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase text-gray-500">Descripción</dt>
                    <dd className="font-medium whitespace-pre-wrap">{form.description || "-"}</dd>
                  </div>
                </dl>

                {!!images.length && (
                  <>
                    <div className="mt-4 text-xs text-gray-500">Orden de publicación (arrastrá en el paso anterior):</div>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2">
                      {images.map((img, i) => (
                        <div key={img.id} className="relative rounded border overflow-hidden">
                          <img src={img.preview} alt={img.name} className="aspect-square w-full object-cover" />
                          <div className="absolute left-1 top-1 rounded bg-white/90 text-[11px] px-1">{i + 1}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {msg && <p className="mt-4 text-sm">{msg}</p>}
              </section>
            )}

            <WizardNav
              step={step}
              setStep={setStep}
              canAdvance={stepCanAdvance}
              onSubmit={doSubmit}
              submitting={saving || uploading}
            />
          </form>
        )}
      </StepperWrapper>
    </div>
  );
}

function StepperWrapper({ children }) {
  const [step, setStep] = useState(0);
  return (
    <div>
      <Stepper current={step} onStepClick={(idx) => setStep(idx)} />
      <div className="mt-6">{children(step, setStep)}</div>
    </div>
  );
}

function WizardNav({ step, setStep, canAdvance, onSubmit, submitting }) {
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const isLast = step === STEPS.length - 1;
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        type="button"
        onClick={prev}
        disabled={step === 0}
        className={classNames("rounded-md border px-4 py-2 text-sm", step === 0 ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50")}
      >
        ← Atrás
      </button>
      {!isLast ? (
        <button
          type="button"
          onClick={() => canAdvance(step) && next()}
          disabled={!canAdvance(step)}
          className={classNames("rounded-md bg-gray-900 px-4 py-2 text-sm text-white", !canAdvance(step) && "cursor-not-allowed opacity-60")}
        >
          Siguiente →
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={classNames("rounded-md bg-gray-900 px-4 py-2 text-sm text-white", submitting && "opacity-60")}
        >
          {submitting ? "Publicando…" : "Publicar"}
        </button>
      )}
    </div>
  );
}
