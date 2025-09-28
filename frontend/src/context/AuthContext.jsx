import React, { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser]   = useState(() => {
    try { const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  });
  const [ready, setReady] = useState(false);

  async function refreshMe(currentToken = token) {
    if (!currentToken) { setUser(null); return null; }
    const res = await fetch("/api/users/me", {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const u = await res.json();
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
      return u;
    }
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
    return null;
  }

  useEffect(() => {
    (async () => {
      if (!token) { setUser(null); setReady(true); return; }
      try { await refreshMe(token); } finally { setReady(true); }
    })();
  }, [token]);

  const loginOk = (jwt, u) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
    if (u) {
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      // si no vino el user en /login, rehidrata
      refreshMe(jwt);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  // expone setter seguro para Account.jsx
  const setUserSafe = (u) => {
    setUser(u);
    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ ready, token, user, loginOk, logout, refreshMe, setUser: setUserSafe }}>
      {children}
    </AuthContext.Provider>
  );
}
