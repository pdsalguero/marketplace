import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const API_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state && location.state.from) || "/";

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Credenciales inválidas");
      }
      const data = await res.json();
      if (!data?.token) throw new Error("Respuesta inválida del servidor");

      localStorage.setItem("token", data.token);
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-10">
      <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded p-2"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <div className="text-sm text-gray-600 mt-4">
        ¿No tienes cuenta? <Link to="/register" className="text-blue-600 hover:underline">Regístrate</Link>
      </div>
    </div>
  );
}
