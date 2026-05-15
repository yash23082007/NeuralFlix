"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Check, ChevronRight, Loader2, Film } from "lucide-react";
import { getUser } from "../../lib/auth";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Welcome, 2: Genres, 3: Movies

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    fetchOnboardingMovies();
  }, []);

  const fetchOnboardingMovies = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/movies/popular?limit=12`);
      if (res.ok) {
        const data = await res.json();
        setMovies(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMovie = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    const user = getUser();
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          liked_movies: selected,
        }),
      });
      router.push("/");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12 px-4 overflow-hidden">
      <div className="mx-auto max-w-4xl relative">
        {/* Background Decorative Elements */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-neural-purple/5 blur-3xl" />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl premium-gradient text-white shadow-glow">
                <Sparkles className="h-10 w-10" />
              </div>
              <h1 className="text-5xl font-black tracking-tight text-text-primary">
                Welcome to Neural<span className="text-accent">Flix</span>
              </h1>
              <p className="mt-6 text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
                Our ML engine needs a few signals to build your unique <span className="text-text-primary font-bold">Taste DNA</span>. 
                Let&apos;s start by picking some movies you love.
              </p>
              <button
                onClick={() => setStep(2)}
                className="mt-12 flex items-center gap-2 rounded-2xl premium-gradient px-8 py-4 text-lg font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started
                <ChevronRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-10"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black text-text-primary">Select 5 or more movies</h2>
                <p className="mt-2 text-text-muted font-medium">This helps us cluster you with similar cinema lovers.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {movies.map((movie) => (
                  <button
                    key={movie._id || movie.tmdb_id}
                    onClick={() => toggleMovie(movie._id || movie.tmdb_id)}
                    className={`group relative aspect-[2/3] overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                      selected.includes(movie._id || movie.tmdb_id)
                        ? "border-accent ring-4 ring-accent/20"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      <p className="text-[10px] font-bold text-white line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {movie.title}
                      </p>
                    </div>
                    {selected.includes(movie._id || movie.tmdb_id) && (
                      <div className="absolute right-2 top-2 rounded-full bg-accent p-1 text-white shadow-lg animate-scale-in">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-6 pt-10">
                <div className="text-sm font-bold text-text-muted">
                  {selected.length} / 5 selected
                </div>
                <button
                  onClick={handleFinish}
                  disabled={selected.length < 5 || saving}
                  className="w-full max-w-sm rounded-2xl premium-gradient py-4 text-lg font-black text-white shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Film className="h-5 w-5" />}
                  {saving ? "Initializing Engine..." : "Initialize Engine"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
