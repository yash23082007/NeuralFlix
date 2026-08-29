/**
 * Movie Intelligence Platform Auth Utility — lib/auth.ts
 *
 * SECURITY: Authentication tokens are stored in HttpOnly cookies set by the backend.
 * The frontend NEVER reads, writes, or transmits JWT tokens directly.
 *
 * This module provides:
 * - authFetch(): Authenticated fetch wrapper (uses credentials: "include")
 * - checkAuth(): Verifies session by calling /api/v1/auth/me
 * - logout(): Calls backend logout endpoint to clear cookies
 * - getUser()/setUser(): Display-only user info in localStorage (NOT the token)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const USER_KEY = "neuralflix_user";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  is_admin?: boolean;
}

/**
 * Get cached user info for display purposes only.
 * This is NOT a security check — use checkAuth() for that.
 */
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

/**
 * Check if user exists in local cache (display-only).
 * Use checkAuth() for a real server-side validation.
 */
export function isAuthenticated(): boolean {
  return !!getUser();
}

import { useUserStore } from "../store/userStore";

/**
 * Cache user info locally for display.
 * Only stores non-sensitive display data (name, email, admin flag).
 */
export function setUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  useUserStore.getState().setUserId(user.id);
}

/**
 * Clear cached user info and redirect to home.
 * Calls the backend logout endpoint to clear HttpOnly cookies.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Even if the logout request fails, clear local state
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
  }
  useUserStore.getState().clearUserId();
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

/**
 * Check if the user is authenticated by calling the backend.
 * This is the ONLY reliable way to check auth state — the backend verifies the cookie.
 */
export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: "include",
    });
    if (res.ok) {
      const user = await res.json();
      setUser(user);
      return user;
    }
  } catch {
    // Auth check failed
  }
  return null;
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const refreshRes = await fetch(
      `${API_BASE}/api/v1/auth/refresh`,
      { method: "POST", credentials: "include" }
    );
    return refreshRes.ok;
  } catch (err) {
    console.error("Token refresh failed:", err);
  }
  return false;
}

/**
 * Authenticated fetch wrapper.
 * Uses credentials: "include" to send HttpOnly cookies automatically.
 * On 401, attempts a single token refresh before retrying.
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    // Attempt refresh (deduplicated)
    if (!refreshPromise) {
      refreshPromise = performRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      res = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    } else {
      // Refresh failed — clear local state
      if (typeof window !== "undefined") {
        localStorage.removeItem(USER_KEY);
      }
    }
  }
  return res;
}

/**
 * @deprecated Use authFetch() instead. Kept for backward compatibility during migration.
 * Returns empty object since tokens are now in HttpOnly cookies.
 */
export function getAuthHeaders(): Record<string, string> {
  return {};
}
