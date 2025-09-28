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

  useEffect(() => {
    (async () => {
      if (!token) { setUser(null); setReady(true); return; }

      try {
        const res = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          cache: "no-store",
        });

        if (res.ok) {
          const u = await res.json();
          setUser(u);
          localStorage.setItem("user", JSON.stringify(u));
        } else if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        } else if (res.status === 304) {
          const raw = localStorage.getItem("user");
          if (raw) setUser(JSON.parse(raw));
        }
      } catch {
        // conserva último user si lo había
      } finally {
        setReady(true);
      }
    })();
  }, [token]);

  const loginOk = (jwt, u) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
    if (u) {
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ ready, token, user, loginOk, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
