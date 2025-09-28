import React, { useContext, useState } from "react";
import Container from "../components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { loginOk } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const j = await res.json(); msg = j?.error || j?.message || msg; } catch {}
        throw new Error(msg);
      }
      const data = await res.json(); // { token, user }
      if (data?.token) loginOk(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(typeof err?.message === "string" ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader><CardTitle>Iniciar sesión</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="w-full border rounded-xl px-3 py-2 text-sm" type="email" value={form.email} onChange={onChange("email")} autoComplete="email" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input className="w-full border rounded-xl px-3 py-2 text-sm" type="password" value={form.password} onChange={onChange("password")} autoComplete="current-password" required />
              </div>
              <button type="submit" disabled={loading} className={`w-full px-4 py-2 rounded-lg text-white ${loading ? "bg-gray-400" : "bg-gray-900 hover:bg-black"}`}>
                {loading ? "Ingresando…" : "Entrar"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
