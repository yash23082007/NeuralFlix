/**
 * NeuralFlix Auth Utility
 * Manages JWT tokens, authentication state, and user session.
 */

const TOKEN_KEY = "neuralflix_access_token";
const USER_KEY = "neuralflix_user";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  is_admin?: boolean;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // Set cookie for middleware/server-side access
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=3600; SameSite=Lax; Secure`;
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // Check if token is expired (JWT payload is base64-encoded)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

import { useUserStore } from "../store/userStore";

export function setUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  useUserStore.getState().setUserId(user.id);
}

export function logout(): void {
  clearToken();
  useUserStore.getState().clearUserId();
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const refreshRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/refresh`,
      { method: "POST", credentials: "include" }
    );
    if (refreshRes.ok) {
      const { access_token } = await refreshRes.json();
      setToken(access_token);
      return access_token;
    }
  } catch (err) {
    console.error("Token refresh failed:", err);
  }
  logout();
  return null;
}

// Auto-refresh: interceptor for expired tokens
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }
  return res;
}

