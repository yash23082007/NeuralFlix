"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Check, ChevronRight, ChevronLeft, Loader2, Film, Heart, Languages } from "lucide-react";
import { getUser } from "../../lib/auth";
import { motion, AnimatePresence } from "framer-motion";

const AVAILABLE_GENRES = [
  { name: "Action", icon: "💥" },
  { name: "Comedy", icon: "😂" },
  { name: "Drama", icon: "🎭" },
  { name: "Horror", icon: "👻" },
  { name: "Sci-Fi", icon: "🚀" },
  { name: "Romance", icon: "💖" },
  { name: "Thriller", icon: "🔪" },
  { name: "Animation", icon: "🎨" },
  { name: "Documentary", icon: "📹" },
  { name: "Mystery", icon: "🔍" },
  { name: "Adventure", icon: "🗺️" },
  { name: "Fantasy", icon: "🦄" }
];

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Welcome, 2: Genres, 3: Movies, 4: Languages

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  // Fetch movies when entering movie selection step (Step 3)
  useEffect(() => {
    if (step === 3) {
      fetchMoviesFilteredByGenres();
    }
  }, [step]);

  const fetchMoviesFilteredByGenres = async () => {
    setLoadingMovies(true);
    try {
      // Fetch movies filtered by the user's selected genres
      let url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/movies/popular?limit=24`;
      if (selectedGenres.length > 0) {
        url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/movies/filter?genres=${encodeURIComponent(selectedGenres.join(","))}&limit=24`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // popular endpoint returns results in results property, filter endpoint does the same.
        const movieResults = data.results || data || [];
        setMovies(movieResults);
      }
    } catch (err) {
      console.error("Error fetching filtered onboarding movies:", err);
    } finally {
      setLoadingMovies(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleMovie = (id: string) => {
    setSelectedMovies(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
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
          liked_genres: selectedGenres,
          liked_movies: selectedMovies,
          languages: selectedLanguages
        }),
      });
      router.push("/");
    } catch (err) {
      console.error("Failed to submit onboarding selections:", err);
    } finally {
      setSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
    exit: { opacity: 0, scale: 1.02, transition: { duration: 0.3 } }
  };

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] pt-28 pb-16 px-4 overflow-hidden relative">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[var(--accent-warm)]/[0.03] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[var(--accent-rose)]/[0.03] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl relative z-10">
        {/* Progress Bar indicator */}
        <div className="flex justify-between items-center mb-12 max-w-md mx-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                  step === s
                    ? "bg-[var(--accent-warm)] text-black border-[var(--accent-warm)] shadow-glow scale-110"
                    : step > s
                    ? "bg-[var(--accent-rose)] text-white border-[var(--accent-rose)]"
                    : "bg-[var(--surface-elevated)] text-[var(--text-tertiary)] border-[var(--border-default)]"
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${
                    step > s ? "bg-[var(--accent-rose)]" : "bg-[var(--border-default)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="text-center max-w-2xl mx-auto"
            >
              <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-black shadow-glow">
                <Sparkles className="h-10 w-10 animate-pulse" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[var(--text-primary)] font-playfair">
                Sequence Your Taste DNA
              </h1>
              <p className="mt-6 text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-sans">
                NeuralFlix uses high-dimensional vector embeddings to map your unique film profile. 
                Answer a few quick questions to initialize the recommendation engines.
              </p>
              <button
                onClick={() => setStep(2)}
                className="mt-12 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] px-8 py-4 text-sm font-bold text-black shadow-lg hover:brightness-110 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider"
              >
                Get Started
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-playfair">
                  What are your favorite genres?
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)] font-sans">
                  Select at least 3 genres to define your initial coordinate vector.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 max-w-3xl mx-auto">
                {AVAILABLE_GENRES.map((g) => {
                  const active = selectedGenres.includes(g.name);
                  return (
                    <button
                      key={g.name}
                      onClick={() => toggleGenre(g.name)}
                      className={`p-5 rounded-2xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden ${
                        active
                          ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-[var(--text-primary)] shadow-glow scale-[1.02]"
                          : "border-[var(--border-default)] bg-[var(--surface-elevated)]/40 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]/30"
                      }`}
                    >
                      <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                        {g.icon}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider font-sans">
                        {g.name}
                      </span>
                      {active && (
                        <div className="absolute right-2 top-2 rounded-full bg-[var(--accent-warm)] p-0.5 text-black">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center max-w-md mx-auto pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider cursor-pointer font-sans"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-xs font-bold text-[var(--text-secondary)] font-mono">
                  {selectedGenres.length} / 3 selected
                </div>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedGenres.length < 3}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-warm)] px-5 py-2.5 text-xs font-bold text-black transition-all hover:brightness-110 disabled:opacity-30 disabled:scale-100 disabled:brightness-100 hover:scale-[1.02] cursor-pointer uppercase tracking-wider shadow-md"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-playfair">
                  Select films you have seen
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)] font-sans">
                  Choose at least 5 movies. We filtered this grid based on your selected genres.
                </p>
              </div>

              {loadingMovies ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
                  <p className="text-xs text-[var(--text-secondary)] font-mono uppercase tracking-wider">
                    Querying movie vector databases...
                  </p>
                </div>
              ) : movies.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[var(--border-default)] rounded-3xl max-w-md mx-auto">
                  <Film className="h-10 w-10 mx-auto text-[var(--text-tertiary)] opacity-50 mb-3" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No matching movies found</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                    Try choosing broader genres or check your internet connection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {movies.map((movie) => {
                    const active = selectedMovies.includes(movie.tmdb_id || movie._id);
                    return (
                      <button
                        key={movie.tmdb_id || movie._id}
                        onClick={() => toggleMovie(movie.tmdb_id || movie._id)}
                        className={`group relative aspect-[2/3] overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                          active
                            ? "border-[var(--accent-warm)] ring-4 ring-[var(--accent-warm)]/10 scale-[0.98]"
                            : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.01]"
                        }`}
                      >
                        {movie.poster_url ? (
                          <Image
                            src={movie.poster_url}
                            alt={movie.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[var(--surface-elevated)] flex items-center justify-center p-4">
                            <span className="text-xs font-semibold text-[var(--text-secondary)] text-center">
                              {movie.title}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="absolute bottom-3 left-3 right-3 text-left">
                          <p className="text-xs font-bold text-white line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {movie.title}
                          </p>
                          {movie.year && (
                            <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono mt-0.5 block">
                              {movie.year}
                            </span>
                          )}
                        </div>
                        {active && (
                          <div className="absolute right-3 top-3 rounded-full bg-[var(--accent-warm)] p-1 text-black shadow-lg animate-scale-in">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center max-w-md mx-auto pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider cursor-pointer font-sans"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-xs font-bold text-[var(--text-secondary)] font-mono">
                  {selectedMovies.length} / 5 selected
                </div>
                <button
                  onClick={() => setStep(4)}
                  disabled={selectedMovies.length < 5}
                  className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-warm)] px-5 py-2.5 text-xs font-bold text-black transition-all hover:brightness-110 disabled:opacity-30 disabled:scale-100 disabled:brightness-100 hover:scale-[1.02] cursor-pointer uppercase tracking-wider shadow-md"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-playfair">
                  Select preferred languages
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)] font-sans">
                  Select at least 1 language filter to optimize foreign title catalog distribution.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
                {AVAILABLE_LANGUAGES.map((l) => {
                  const active = selectedLanguages.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      onClick={() => toggleLanguage(l.code)}
                      className={`p-5 rounded-2xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 relative ${
                        active
                          ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-[var(--text-primary)] shadow-glow scale-[1.02]"
                          : "border-[var(--border-default)] bg-[var(--surface-elevated)]/40 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]/30"
                      }`}
                    >
                      <span className="text-3xl filter drop-shadow-md">
                        {l.flag}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider font-sans">
                        {l.name}
                      </span>
                      {active && (
                        <div className="absolute right-2 top-2 rounded-full bg-[var(--accent-warm)] p-0.5 text-black">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center max-w-md mx-auto pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider cursor-pointer font-sans"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-xs font-bold text-[var(--text-secondary)] font-mono">
                  {selectedLanguages.length} / 1 selected
                </div>
                <button
                  onClick={handleFinish}
                  disabled={selectedLanguages.length < 1 || saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] px-6 py-3 text-xs font-black text-black hover:brightness-110 disabled:opacity-30 disabled:scale-100 disabled:brightness-100 hover:scale-[1.02] cursor-pointer uppercase tracking-wider shadow-glow"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sequencing...
                    </>
                  ) : (
                    <>
                      <Heart className="h-4 w-4" />
                      Initialize Engine
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
