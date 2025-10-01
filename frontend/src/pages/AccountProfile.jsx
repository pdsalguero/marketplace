import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";

function Field({ label, children, error }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function AccountProfile() {
  const { token, user, refreshMe, setUser } = useContext(AuthContext);

  const [provinces, setProvinces] = useState([]);
  const [cities, setCities]       = useState([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingCity, setLoadingCity] = useState(false);

  const initial = useMemo(() => ({
    displayName: user?.profile?.displayName || "",
    phone:       user?.profile?.phone || "",
    avatarUrl:   user?.profile?.avatarUrl || "",
    addressText: user?.profile?.addressText || "",
    // slugs se resuelven al cargar las listas (por los IDs del perfil)
    provinceSlug: "",
    citySlug: "",
  }), [user]);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({});

  // Carga provincias y mapea el provinceId del perfil a su slug
  useEffect(() => {
    let abort = false;
    (async () => {
      setLoadingProv(true);
      try {
        const res = await fetch("/api/locations/provinces", { cache: "no-store" });
        const data = res.ok ? await res.json() : { items: [] };
        if (abort) return;
        const items = data.items || data || [];
        setProvinces(items);

        // si el perfil tiene provinceId, ajusta slug
        const prov = items.find(p => p.id === user?.profile?.provinceId);
        const provinceSlug = prov?.slug || "";
        setForm(f => ({ ...f, provinceSlug }));

        // si hay provincia, carga ciudades y setea city por id
        if (provinceSlug) {
          setLoadingCity(true);
          const r2 = await fetch(`/api/locations/cities?provinceSlug=${encodeURIComponent(provinceSlug)}`, { cache: "no-store" });
          const d2 = r2.ok ? await r2.json() : { items: [] };
          const citiesItems = d2.items || [];
          if (!abort) {
            setCities(citiesItems);
            const city = citiesItems.find(c => c.id === user?.profile?.cityId);
            setForm(f => ({ ...f, citySlug: city?.slug || "" }));
          }
        } else {
          setCities([]);
          setForm(f => ({ ...f, citySlug: "" }));
        }
      } catch {
        if (!abort) { setProvinces([]); setCities([]); }
      } finally {
        if (!abort) setLoadingProv(false), setLoadingCity(false);
      }
    })();
    return () => { abort = true; };
  }, [user?.profile?.provinceId, user?.profile?.cityId]);

  const onChange = (k) => (e) => {
    const v = e?.target?.value ?? e;
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((pe) => ({ ...pe, [k]: "" }));
    setMsg("");
  };

  // al cambiar provincia, recarga ciudades y limpia citySlug
  useEffect(() => {
    let abort = false;
    (async () => {
      if (!form.provinceSlug) { setCities([]); setForm(f => ({ ...f, citySlug: "" })); return; }
      setLoadingCity(true);
      try {
        const r = await fetch(`/api/locations/cities?provinceSlug=${encodeURIComponent(form.provinceSlug)}`, { cache: "no-store" });
        const d = r.ok ? await r.json() : { items: [] };
        if (!abort) {
          setCities(d.items || []);
          // si la ciudad actual no pertenece, limpia
          if (!(d.items || []).some(c => c.slug === form.citySlug)) {
            setForm(f => ({ ...f, citySlug: "" }));
          }
        }
      } catch {
        if (!abort) { setCities([]); setForm(f => ({ ...f, citySlug: "" })); }
      } finally {
        if (!abort) setLoadingCity(false);
      }
    })();
    return () => { abort = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.provinceSlug]);

  const validate = () => {
    const e = {};
    if (!form.displayName?.trim()) e.displayName = "El nombre es obligatorio";
    if (form.phone && !/^[\d+()\-\s]{6,}$/.test(form.phone)) e.phone = "Teléfono inválido";
    if (form.avatarUrl && !/^https?:\/\//i.test(form.avatarUrl)) e.avatarUrl = "Debe ser una URL http(s)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSave = async (ev) => {
    ev.preventDefault();
    setMsg("");
    if (!validate()) return;
    if (!token) { setMsg("No hay sesión activa."); return; }

    try {
      setSaving(true);
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: form.displayName || undefined,
          phone:       form.phone       || undefined,
          avatarUrl:   form.avatarUrl   || undefined,
          provinceSlug: form.provinceSlug || undefined,
          citySlug:     form.citySlug     || undefined,
          addressText:  form.addressText  || undefined,
        }),
      });
      if (!res.ok) {
        let m = `Error ${res.status}`;
        try { const j = await res.json(); m = j?.error || j?.message || m; } catch {}
        throw new Error(m);
      }
      const updated = await refreshMe();
      if (updated) setUser(updated);
      setMsg("✅ Datos actualizados");
    } catch (err) {
      setMsg(err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.displayName || user?.email || "US").slice(0,2).toUpperCase();

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Perfil</h2>

      <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Avatar */}
        <div className="md:col-span-1">
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 rounded-full bg-gray-100 border flex items-center justify-center overflow-hidden">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500 text-xl font-semibold">{initials}</span>
              )}
            </div>
            <Field label="Avatar URL" error={errors.avatarUrl}>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.avatarUrl}
                onChange={onChange("avatarUrl")}
                placeholder="https://…"
              />
            </Field>
          </div>
        </div>

        {/* Columna Datos */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre para mostrar" error={errors.displayName}>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.displayName}
                onChange={onChange("displayName")}
                placeholder="Ej: Juan Pérez"
                required
              />
            </Field>

            <Field label="Teléfono" error={errors.phone}>
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.phone}
                onChange={onChange("phone")}
                placeholder="+56 9 1234 5678"
              />
            </Field>

            <Field label="Provincia">
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={form.provinceSlug}
                onChange={onChange("provinceSlug")}
                disabled={loadingProv}
              >
                <option value="">{loadingProv ? "Cargando…" : "Selecciona provincia"}</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.slug}>{p.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Ciudad">
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={form.citySlug}
                onChange={onChange("citySlug")}
                disabled={!form.provinceSlug || loadingCity}
              >
                <option value="">
                  {!form.provinceSlug ? "Selecciona provincia primero" : (loadingCity ? "Cargando…" : "Selecciona ciudad")}
                </option>
                {cities.map(c => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Dirección">
              <input
                className="w-full border rounded-xl px-3 py-2"
                value={form.addressText}
                onChange={onChange("addressText")}
                placeholder="Calle 123, depto 4B"
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-white ${saving ? "bg-gray-400" : "bg-gray-900 hover:bg-black"}`}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
      </form>
    </div>
  );
}
