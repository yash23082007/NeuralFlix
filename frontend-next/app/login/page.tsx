"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn, Film, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { setToken, setUser } from "../../lib/auth";
import GoogleLogin from "../../components/GoogleLogin";
import GithubLogin from "../../components/GithubLogin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (code) {
      handleGithubCallback(code);
    }
  }, []);

  const handleGithubCallback = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/github`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "GitHub login failed");
      }
      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Login failed");
      }
      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user || { email });
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)] px-4 pt-20 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[var(--accent-warm)]/[0.03] blur-[100px] animate-orb-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent-rose)]/[0.03] blur-[100px] animate-orb-float" style={{ animationDelay: "-10s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Ambient glow */}
        <div className="absolute -inset-20 rounded-3xl bg-gradient-to-br from-[var(--accent-warm)]/[0.04] to-[var(--accent-rose)]/[0.04] blur-3xl pointer-events-none" />

        <div className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/90 p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] shadow-glow"
            >
              <Film className="h-7 w-7 text-black" />
            </motion.div>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                Sign in to your NeuralFlix account
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20 px-4 py-3 text-sm text-[var(--accent-rose)]"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none input-glow"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none input-glow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent-warm)] py-3 text-sm font-semibold text-black shadow-glow transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </motion.button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span className="text-xs font-medium text-[var(--text-disabled)] uppercase tracking-wider">
              Or
            </span>
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <div className="space-y-3 mb-4">
            <GoogleLogin />
            <GithubLogin />
          </div>

          <p className="mt-6 text-center text-sm text-[var(--text-tertiary)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--accent-warm)] hover:text-[var(--accent-warm-dim)] transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
