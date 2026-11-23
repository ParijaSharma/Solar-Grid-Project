import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("solarhub-token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch("/api/auth/me")
      .then((res) => {
        if (res.error) {
          localStorage.removeItem("solarhub-token");
          setUser(null);
        } else {
          setUser(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.error) return res;

    localStorage.setItem("solarhub-token", res.data.access_token);

    const userRes = await apiFetch("/api/auth/me");

    if (userRes.error) {
      localStorage.removeItem("solarhub-token");
      return userRes;
    }

    setUser(userRes.data);
    return { data: userRes.data, error: null };
  }

  async function register(details) {
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(details),
    });

    return res;
  }

  function logout() {
    localStorage.removeItem("solarhub-token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
