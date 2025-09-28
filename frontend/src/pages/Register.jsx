import React, { useState } from "react";
import Container from "../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);

  // errores por campo + general
  const [errors, setErrors] = useState({ email: "", form: "" });

  const onChange = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    // limpia error del campo al tipear
    if (k === "email" && errors.email) setErrors((p) => ({ ...p, email: "" }));
    if (errors.form) setErrors((p) => ({ ...p, form: "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", form: "" });

    if (!form.email || !form.password) {
      setErrors((p) => ({ ...p, form: "Email y contraseña son obligatorios." }));
      return;
    }

    try {
      setLoading(true);
      const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
      //const res = await fetch("http://localhost:4001/api/auth/register", {
      const res = await fetch(`${base}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          displayName: form.name || undefined, // el backend espera "displayName"
        }),
      });

      if (!res.ok) {
        // intenta parsear body para detectar el tipo de error
        let msg = "";
        try {
          const data = await res.json();
          msg = data?.message || data?.error || "";
        } catch {
          msg = await res.text();
        }

        // caso típico: email existente
        const lower = (msg || "").toLowerCase();
        if (lower.includes("email") && (lower.includes("exists") || lower.includes("registrado"))) {
          setErrors({ email: "Este email ya está registrado.", form: "" });
        } else {
          setErrors({ email: "", form: msg || `Error ${res.status}` });
        }
        return;
      }

      const data = await res.json(); // { token, user }
      if (data?.token) localStorage.setItem("token", data.token);
      navigate("/publish");
    } catch (err) {
      setErrors({ email: "", form: "No se pudo registrar. Intenta nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  value={form.name}
                  onChange={onChange("name")}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  className={`w-full border rounded-xl px-3 py-2 text-sm ${errors.email ? "border-red-400" : ""}`}
                  type="email"
                  value={form.email}
                  onChange={onChange("email")}
                  autoComplete="email"
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  type="password"
                  value={form.password}
                  onChange={onChange("password")}
                  autoComplete="new-password"
                  required
                />
              </div>

              {/* error general debajo del formulario */}
              {errors.form && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errors.form}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full px-4 py-2 rounded-lg text-white ${
                  loading ? "bg-gray-400" : "bg-gray-900 hover:bg-black"
                }`}
              >
                {loading ? "Registrando…" : "Registrarme"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
