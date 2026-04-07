import { useState, useEffect, useCallback } from "react";

const API = "https://functions.poehali.dev/38bb9bf3-757f-4249-a2d5-9154b2397cf9";

export type User = {
  id: number;
  email: string;
  username: string;
  steam_id: string | null;
  role: "player" | "admin";
  is_banned: boolean;
  ban_reason: string | null;
};

export function getToken(): string {
  return localStorage.getItem("cs_token") || "";
}

export function setToken(t: string) {
  localStorage.setItem("cs_token", t);
}

export function clearToken() {
  localStorage.removeItem("cs_token");
}

export function apiCall(action: string, body?: object, method: "GET" | "POST" = "POST") {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Session-Token"] = token;

  if (method === "GET") {
    return fetch(`${API}?action=${action}`, { headers });
  }
  return fetch(API, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...body }),
  });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}?action=me`, {
        headers: { "X-Session-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        clearToken();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const logout = async () => {
    await apiCall("logout");
    clearToken();
    setUser(null);
  };

  return { user, loading, logout, refetch: fetchMe };
}
