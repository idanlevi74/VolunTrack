import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function fetchMe(token) {
  if (!API_BASE) throw new Error("NO_API_BASE");

  const res = await fetch(`${API_BASE}/api/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("UNAUTHORIZED");
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuth = !!user;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const me = await fetchMe(token);
        if (!alive) return;
        setUser(me);
      } catch {
        localStorage.removeItem("accessToken");
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const login = async ({ token, user: maybeUser }) => {
    localStorage.setItem("accessToken", token);
    setLoading(true);

    try {
      if (maybeUser?.role) {
        setUser(maybeUser);
      } else {
        const me = await fetchMe(token);
        setUser(me);
      }
    } catch {
      localStorage.removeItem("accessToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
