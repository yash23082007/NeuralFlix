"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, Film } from "lucide-react";
import GoogleLogin from "../../components/GoogleLogin";
import GithubLogin from "../../components/GithubLogin";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)] px-4 pt-20">
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-16 rounded-3xl bg-gradient-to-br from-[var(--accent-warm)]/5 to-[var(--accent-rose)]/5 blur-3xl pointer-events-none" />

        <div className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-8 shadow-xl">
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] shadow-sm">
              <Film className="h-6 w-6 text-black" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Create account
              </h1>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                Join NeuralFlix for personalized film recommendations
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20 px-4 py-3 text-sm text-[var(--accent-rose)]">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-[var(--text-secondary)]">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none transition-all focus:border-[var(--accent-warm)] focus:ring-1 focus:ring-[var(--accent-warm)]/30"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[var(--text-secondary)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none transition-all focus:border-[var(--accent-warm)] focus:ring-1 focus:ring-[var(--accent-warm)]/30"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none transition-all focus:border-[var(--accent-warm)] focus:ring-1 focus:ring-[var(--accent-warm)]/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--text-secondary)]">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none transition-all focus:border-[var(--accent-warm)] focus:ring-1 focus:ring-[var(--accent-warm)]/30"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent-warm)] py-3 text-sm font-semibold text-black shadow-sm transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? "Creating account..." : "Create Account"}
            </button>
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
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--accent-warm)] hover:text-[var(--accent-warm-dim)] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
