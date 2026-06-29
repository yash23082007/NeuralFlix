"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus, Film, Sparkles, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import GoogleLogin from "../../components/GoogleLogin";
import GithubLogin from "../../components/GithubLogin";

interface CollageMovie {
  tmdb_id: number;
  poster_url: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [collageMovies, setCollageMovies] = useState<CollageMovie[]>([]);

  useEffect(() => {
    // Fetch popular movies for the collage
    async function fetchCollage() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/api/v1/movies/trending`);
        if (res.ok) {
          const data = await res.json();
          const movies = (data.results || [])
            .filter((m: any) => m.poster_url)
            .map((m: any) => ({
              tmdb_id: m.tmdb_id,
              poster_url: m.poster_url
            }));
          setCollageMovies(movies.slice(0, 18));
        }
      } catch (err) {
        console.error("Collage fetch failed:", err);
      }
    }
    fetchCollage();
  }, []);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "Empty", color: "bg-zinc-800" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    switch (score) {
      case 1:
      case 2:
        return { score, label: "Weak", color: "bg-[var(--accent-rose)]" };
      case 3:
      case 4:
        return { score, label: "Medium", color: "bg-[var(--accent-warm)]" };
      case 5:
        return { score, label: "Strong", color: "bg-emerald-500" };
      default:
        return { score, label: "Too short", color: "bg-zinc-800" };
    }
  };

  const strength = getPasswordStrength(password);

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
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[var(--surface-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Left panel: poster collage */}
      <section className="lg:col-span-7 xl:col-span-8 hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--surface-primary)] border-r border-[var(--border-subtle)]">
        {/* Animated scrolling collage */}
        <div className="absolute inset-0 grid grid-cols-3 gap-4 p-4 opacity-25 scale-105 pointer-events-none origin-center rotate-6 translate-y-[-10%]">
          {[0, 1, 2].map((colIndex) => (
            <div
              key={colIndex}
              className={`flex flex-col gap-4 ${
                colIndex === 1 ? "animate-scroll-slow-reverse" : "animate-scroll-slow"
              }`}
            >
              {(collageMovies.length > 0 ? collageMovies : Array.from({ length: 6 })).map((m: any, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] w-full rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] overflow-hidden shadow-card transition-transform duration-500 hover:scale-105"
                >
                  {m?.poster_url ? (
                    <img
                      src={m.poster_url}
                      alt="Cinema Poster"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-8 w-8 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Ambient Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-radial-gradient z-10" />

        {/* Brand info overlays */}


        <div className="relative z-20 space-y-6 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--accent-warm)]/20 bg-[var(--accent-warm)]/10 text-xs font-semibold text-[var(--accent-warm)] mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Neural Engine v2.5 Online
            </span>
            <h1 className="text-4xl xl:text-5xl font-extrabold font-playfair tracking-tight leading-tight text-[var(--text-primary)] mb-4">
              Discover over <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] font-black">930K Films</span> personalized for you.
            </h1>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed">
              Unlock a cinematic universe calibrated to your unique Taste DNA. Real-time recommendation streams, cross-region collections, and infinite movie discoveries.
            </p>
          </motion.div>
        </div>

        <div className="relative z-20 text-xs text-[var(--text-tertiary)] font-mono">
          © 2024 NeuralFlix. All rights reserved.
        </div>
      </section>

      {/* Right panel: authentication form */}
      <section className="lg:col-span-5 xl:col-span-4 col-span-12 flex items-center justify-center p-8 bg-[var(--surface-primary)] relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6 z-20 my-auto">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-extrabold font-playfair tracking-tight text-[var(--text-primary)]">Create Account</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Join NeuralFlix to build your Taste DNA and track films.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20 px-4 py-3 text-xs text-[var(--accent-rose)] font-semibold"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-1">
              <label htmlFor="register-name" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-warm)] transition-all font-sans"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="register-email" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-warm)] transition-all font-sans"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="register-password" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 pr-11 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-warm)] transition-all font-sans"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {/* Password strength meter */}
              {password && (
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[var(--text-tertiary)] font-semibold uppercase">Security Strength:</span>
                    <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          i < strength.score ? strength.color : "bg-[var(--surface-elevated)]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="register-confirm" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-warm)] transition-all font-sans"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[var(--accent-warm)] hover:brightness-110 active:scale-[0.99] text-black text-sm font-bold uppercase tracking-wider shadow-[0_0_24px_rgba(232,168,73,0.2)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? "Creating Profile..." : "Create Account"}
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--border-default)]"></div>
            <span className="flex-shrink mx-4 text-[var(--text-tertiary)] text-xs font-mono uppercase">Or connect via</span>
            <div className="flex-grow border-t border-[var(--border-default)]"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GoogleLogin />
            <GithubLogin />
          </div>

          <p className="text-center text-xs text-[var(--text-secondary)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-[var(--accent-warm)] hover:underline transition-colors ml-1"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

