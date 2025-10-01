import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function classNames(...c) { return c.filter(Boolean).join(" "); }
const MAX_FILES = 10;
const genId = () => (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const readAsDataURL = (file) => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
});
const loadImageEl = (src) => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
});
const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
const renameWithExt = (name, ext) => `${name.replace(/\.[^.]+$/, "")}.${ext}`;
async function compressImage(file, { maxW = 1600, maxH = 1600, quality = 0.82, convertTo = "image/jpeg" } = {}) {
  try {
    if (!file.type?.startsWith("image/")) return file;
    const dataUrl = await readAsDataURL(file);
    const img = await loadImageEl(dataUrl);
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const outW = Math.max(1, Math.round(img.width * scale));
    const outH = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    canvas.getContext("2d").drawImage(img, 0, 0, outW, outH);
    const blob = await canvasToBlob(canvas, convertTo, quality);
    if (!blob) return file;
    return (blob.size < file.size)
      ? new File([blob], renameWithExt(file.name, "jpg"), { type: convertTo, lastModified: Date.now() })
      : file;
  } catch { return file; }
}

function DropzoneGallery({ items, setItems }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragId = useRef(null);

  const addFiles = (fileList) => {
    const next = [];
    for (const f of Array.from(fileList || [])) {
      if (!f.type?.startsWith("image/")) continue;
      next.push({ id: genId(), file: f, preview: URL.createObjectURL(f), name: f.name, type: f.type, isNew: true });
    }
    if (!next.length) return;
    setItems((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const removeOne = (id) => {
    const it = items.find((x) => x.id === id);
    if (it?.preview && it.isNew) URL.revokeObjectURL(it.preview);
    setItems(items.filter((x) => x.id !== id));
  };

  const onThumbDragStart = (id) => (e) => { dragId.current = id; e.dataTransfer.effectAllowed = "move"; };
  const onThumbDrop = (targetId) => (e) => {
    e.preventDefault();
    const srcId = dragId.current; if (!srcId || srcId === targetId) return;
    const srcIdx = items.findIndex((x) => x.id === srcId);
    const tgtIdx = items.findIndex((x) => x.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const copy = items.slice();
    const [moved] = copy.splice(srcIdx, 1);
    copy.splice(tgtIdx, 0, moved);
    setItems(copy); dragId.current = null;
  };

  return (
    <div className="space-y-3">
      <div
        className={classNames("rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer",
          dragging ? "border-gray-900 bg-gray-50" : "border-gray-300")}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-sm text-gray-700">Arrastrá imágenes o <span className="underline">hacé click</span></div>
        <div className="text-xs text-gray-500 mt-1">Hasta {MAX_FILES} imágenes</div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>

      {!!items.length && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {items.map((img, idx) => (
            <div key={img.id}
              className="relative group rounded-xl overflow-hidden border"
              draggable
              onDragStart={onThumbDragStart(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onThumbDrop(img.id)}
              title="Arrastrar para reordenar"
            >
              <img src={img.preview || img.url} alt={img.name || "img"} className="aspect-video w-full object-cover" />
              <div className="absolute left-2 top-2 bg-white/90 rounded px-2 text-xs font-medium">{idx + 1}</div>
              <button type="button" onClick={() => removeOne(img.id)}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2 text-xs opacity-0 group-hover:opacity-100 transition"
                title="Quitar">×</button>
              <div className="absolute inset-0 pointer-events-none group-hover:outline group-hover:outline-2 group-hover:outline-gray-700/50 rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "active",   label: "Activo" },
  { value: "paused",   label: "Pausado" },
  { value: "draft",    label: "Borrador" },
  { value: "sold_out", label: "Sin stock" },
];

export default function AdEdit() {
  const { token } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "", description: "", price: "", currency: "ARS", condition: "new",
    categorySlug: "", provinceSlug: "", citySlug: "", status: "active",
  });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [catsL1, setCatsL1] = useState([]), [catsL2, setCatsL2] = useState([]), [catsL3, setCatsL3] = useState([]);
  const [selL1, setSelL1] = useState(""), [selL2, setSelL2] = useState(""), [selL3, setSelL3] = useState("");
  const [loadingCats, setLoadingCats] = useState(true), [loadingSub1, setLoadingSub1] = useState(false), [loadingSub2, setLoadingSub2] = useState(false);

  const [provs, setProvs] = useState([]), [cities, setCities] = useState([]);
  const [loadingProvs, setLoadingProvs] = useState(true), [loadingCities, setLoadingCities] = useState(false);

  const [items, setItems] = useState([]); // [{id,url? ,file?, preview?, isNew?}]

  const onChange = (k) => (e) => { setForm((p) => ({ ...p, [k]: e?.target?.value ?? e })); if (errors[k]) setErrors((pe) => ({ ...pe, [k]: "" })); setMsg(""); };

  useEffect(() => {
    (async () => {
      try {
        const [rc, rp] = await Promise.all([ fetch("/api/categories"), fetch("/api/locations/provinces") ]);
        setCatsL1(rc.ok ? await rc.json() : []);
        const dp = rp.ok ? await rp.json() : { items: [] };
        setProvs(Array.isArray(dp.items) ? dp.items : Array.isArray(dp) ? dp : []);
      } catch { setCatsL1([]); setProvs([]); }
      finally { setLoadingCats(false); setLoadingProvs(false); }
    })();
  }, []);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch(`/api/ads/${encodeURIComponent(id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!r.ok) throw new Error(`Error ${r.status}`);
        const d = await r.json();

        if (abort) return;

        setForm((p) => ({
          ...p,
          title: d.title || "",
          description: d.description || "",
          price: String(d.price ?? ""),
          currency: d.currency || "ARS",
          condition: d.condition || "new",
          status: d.status || "active",
          categorySlug: d.categorySlug || "",
          provinceSlug: d.province?.slug || "",
          citySlug: d.city?.slug || "",
        }));

        const gallery = Array.isArray(d.media) ? d.media.map((m) => ({
          id: String(m.id), url: m.url, preview: m.url, isNew: false, name: m.url?.split("/").pop(),
        })) : [];
        setItems(gallery);

        const path = Array.isArray(d.categoryPath) ? d.categoryPath : [];
        const [l1, l2, l3] = path;
        setSelL1(l1 || "");
        if (l1) {
          setLoadingSub1(true);
          const r1 = await fetch(`/api/categories/${encodeURIComponent(l1)}/children`); const c2 = r1.ok ? await r1.json() : [];
          setCatsL2(c2); setLoadingSub1(false);
        }
        setSelL2(l2 || "");
        if (l2) {
          setLoadingSub2(true);
          const r2 = await fetch(`/api/categories/${encodeURIComponent(l2)}/children`); const c3 = r2.ok ? await r2.json() : [];
          setCatsL3(c3); setLoadingSub2(false);
        }
        setSelL3(l3 || "");

        if (d.province?.slug) {
          setLoadingCities(true);
          const rc = await fetch(`/api/locations/cities?provinceSlug=${encodeURIComponent(d.province.slug)}`);
          const dc = rc.ok ? await rc.json() : { items: [] };
          setCities(Array.isArray(dc.items) ? dc.items : []);
          setLoadingCities(false);
        }
      } catch (e) {
        setMsg("No se pudo cargar el anuncio");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [id, token]);

  useEffect(() => {
    setSelL2(""); setSelL3(""); setCatsL2([]); setCatsL3([]);
    if (!selL1) return;
    (async () => {
      setLoadingSub1(true);
      try { const r = await fetch(`/api/categories/${encodeURIComponent(selL1)}/children`); setCatsL2(r.ok ? await r.json() : []); }
      finally { setLoadingSub1(false); }
    })();
  }, [selL1]);

  useEffect(() => {
    setSelL3(""); setCatsL3([]);
    if (!selL2) { setForm((f) => ({ ...f, categorySlug: selL1 || "" })); return; }
    (async () => {
      setLoadingSub2(true);
      try { const r = await fetch(`/api/categories/${encodeURIComponent(selL2)}/children`); setCatsL3(r.ok ? await r.json() : []); }
      finally { setLoadingSub2(false); }
    })();
  }, [selL2]);

  useEffect(() => {
    const slug = selL3 || selL2 || selL1 || "";
    setForm((f) => (f.categorySlug === slug ? f : { ...f, categorySlug: slug }));
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
      } finally { if (!abort) setLoadingCities(false); }
    })();
    return () => { abort = true; };
  }, [form.provinceSlug]);

  const priceHelp = useMemo(() => {
    const n = Number(String(form.price).replace(",", "."));
    if (!(n > 0)) return "";
    return n.toLocaleString(undefined, { style: "currency", currency: form.currency || "USD", maximumFractionDigits: 0 });
  }, [form.price, form.currency]);

  const validate = () => {
    const e = {};
    if (!form.categorySlug) e.categorySlug = "Categoría requerida";
    if (!form.title?.trim()) e.title = "Título requerido";
    if (!(Number(String(form.price).replace(",", ".")) > 0)) e.price = "Precio inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadNewAndBuildMedia = async () => {
    const newOnes = items.filter((it) => it.file);
    let uploaded = [];
    if (newOnes.length) {
      const compressed = [];
      for (const it of newOnes) compressed.push(await compressImage(it.file, { quality: 0.82 }));
      const reqFiles = compressed.map((f) => ({ fileName: f.name || "upload.jpg", fileType: f.type || "image/jpeg" }));
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
      const itemsRes = Array.isArray(data?.items) ? data.items : [];
      if (!itemsRes.length) throw new Error("Respuesta de pre-firma vacía");

      for (let i = 0; i < compressed.length; i++) {
        const f = compressed[i];
        const it = itemsRes[i];
        const putURL = it?.uploadURL, key = it?.key, url = it?.url;
        if (!putURL || !key) throw new Error("Estructura inesperada (falta uploadURL/key)");
        const r = await fetch(putURL, { method: "PUT", body: f, headers: { "Content-Type": f.type || "image/jpeg" } });
        if (!r.ok) throw new Error(`Fallo subiendo ${f.name} (${r.status})`);
        uploaded.push({ key, url });
      }
    }

    const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BUCKET_BASE;
    const base = typeof PUBLIC_BASE === "string" ? PUBLIC_BASE.replace(/\/+$/, "") : "";
    const final = items.map((it, idx) => {
      if (it.file) {
        const up = uploaded.shift();
        const finalUrl = up?.url || (base ? `${base}/${up?.key}` : null);
        if (!finalUrl) throw new Error("No se pudo resolver URL pública de imagen nueva");
        return { url: finalUrl, position: idx };
      }
      return { url: it.url, position: idx };
    });
    return final;
  };

  const save = async () => {
    setMsg(""); if (!validate()) return;
    setSaving(true);
    try {
      const media = await uploadNewAndBuildMedia();

      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        price: Number(String(form.price).replace(",", ".")),
        condition: form.condition,
        categorySlug: form.categorySlug || undefined,
        provinceSlug: form.provinceSlug || undefined,
        citySlug: form.citySlug || undefined,
        status: form.status || "active", // ← enviar status
        media,
      };

      const r = await fetch(`/api/ads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let m = `Error ${r.status}`; try { const j = await r.json(); m = j?.error || j?.message || m; } catch {}
        throw new Error(m);
      }
      navigate("/account/listings");
    } catch (e) {
      setMsg(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-gray-500">Cargando…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Editar anuncio</h1>
      <p className="text-sm text-gray-600 mb-6">ID: {id}</p>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
        {/* Categoría */}
        <section className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Categoría *</label>
            <select className="w-full border rounded-xl px-3 py-2" value={selL1} onChange={(e) => setSelL1(e.target.value)} disabled={loadingCats}>
              <option value="">{loadingCats ? "Cargando…" : "Selecciona categoría"}</option>
              {catsL1.map((c) => (<option key={c.id || c.slug} value={c.slug}>{c.name}</option>))}
            </select>
            {errors.categorySlug && <p className="text-xs text-red-600 mt-1">{errors.categorySlug}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subcategoría</label>
            <select className="w-full border rounded-xl px-3 py-2" value={selL2} onChange={(e) => setSelL2(e.target.value)} disabled={!selL1 || loadingSub1}>
              <option value="">{!selL1 ? "Selecciona categoría primero" : (loadingSub1 ? "Cargando…" : "(opcional)")}</option>
              {catsL2.map((c) => (<option key={c.id || c.slug} value={c.slug}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sub-subcategoría</label>
            <select className="w-full border rounded-xl px-3 py-2" value={selL3} onChange={(e) => setSelL3(e.target.value)} disabled={!selL2 || loadingSub2}>
              <option value="">{!selL2 ? "Selecciona subcategoría primero" : (loadingSub2 ? "Cargando…" : "(opcional)")}</option>
              {catsL3.map((c) => (<option key={c.id || c.slug} value={c.slug}>{c.name}</option>))}
            </select>
          </div>
        </section>

        {/* Detalles */}
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Título *</label>
              <input className="w-full border rounded-xl px-3 py-2" value={form.title} onChange={onChange("title")} />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Condición *</label>
              <select className="w-full border rounded-xl px-3 py-2" value={form.condition} onChange={onChange("condition")}>
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_160px_1fr]">
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio *</label>
              <input className="w-full border rounded-xl px-3 py-2" type="number" min="0" value={form.price} onChange={onChange("price")} />
              {errors.price ? (
                <p className="text-xs text-red-600 mt-1">{errors.price}</p>
              ) : (
                <div className="text-xs text-gray-500">{priceHelp}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Moneda</label>
              <select className="w-full border rounded-xl px-3 py-2" value={form.currency} onChange={onChange("currency")}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            {/* NUEVO: Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <select className="w-full border rounded-xl px-3 py-2" value={form.status || "active"} onChange={onChange("status")}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-gray-500">“Activo” se muestra públicamente; “Pausado”/“Borrador” lo ocultan; “Sin stock” lo muestra sin disponibilidad.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Provincia</label>
              <select className="w-full border rounded-xl px-3 py-2" value={form.provinceSlug} onChange={onChange("provinceSlug")} disabled={loadingProvs}>
                <option value="">{loadingProvs ? "Cargando…" : "Selecciona provincia (opcional)"}</option>
                {provs.map((p) => (<option key={p.id} value={p.slug}>{p.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ciudad</label>
              <select className="w-full border rounded-xl px-3 py-2" value={form.citySlug} onChange={onChange("citySlug")} disabled={!form.provinceSlug || loadingCities}>
                <option value="">{!form.provinceSlug ? "Selecciona provincia primero" : (loadingCities ? "Cargando…" : "Selecciona ciudad (opcional)")}</option>
                {cities.map((c) => (<option key={c.id} value={c.slug}>{c.name}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea className="w-full border rounded-xl px-3 py-2" rows={4} value={form.description} onChange={onChange("description")} />
          </div>
        </section>

        {/* Galería */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
          <DropzoneGallery items={items} setItems={setItems} />
        </section>

        {msg && <div className="text-sm mt-2">{msg}</div>}

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">← Cancelar</button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={classNames("rounded-md bg-gray-900 px-4 py-2 text-sm text-white", saving && "opacity-60")}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
