"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, ChevronRight, ChevronLeft, Loader2, Film, Heart, Languages, RefreshCw, Compass } from "lucide-react";
import { getUser, authFetch, isAuthenticated } from "../../lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import TasteDNA from "../../components/TasteDNA";

const AVAILABLE_GENRES = [
  { name: "Action", icon: "💥", image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80" },
  { name: "Comedy", icon: "😂", image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=300&q=80" },
  { name: "Drama", icon: "🎭", image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80" },
  { name: "Horror", icon: "👻", image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=300&q=80" },
  { name: "Sci-Fi", icon: "🚀", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80" },
  { name: "Romance", icon: "💖", image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=300&q=80" },
  { name: "Thriller", icon: "🔪", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=80" },
  { name: "Animation", icon: "🎨", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=300&q=80" },
  { name: "Documentary", icon: "📹", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=300&q=80" },
  { name: "Mystery", icon: "🔍", image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=300&q=80" },
  { name: "Adventure", icon: "🗺️", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80" },
  { name: "Fantasy", icon: "🦄", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80" },
  { name: "Crime", icon: "🕵️", image: "https://images.unsplash.com/photo-1453873531674-215110190687?auto=format&fit=crop&w=300&q=80" },
  { name: "Family", icon: "👨‍👩‍👧‍👦", image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=300&q=80" },
  { name: "Music", icon: "🎵", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80" },
  { name: "History", icon: "⏳", image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=300&q=80" },
  { name: "War", icon: "⚔️", image: "https://images.unsplash.com/photo-1505672678657-cc7037095e60?auto=format&fit=crop&w=300&q=80" },
  { name: "Western", icon: "🤠", image: "https://images.unsplash.com/photo-1533240332313-0db49b439ad3?auto=format&fit=crop&w=300&q=80" }
];

const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳" }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<any[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Welcome, 2: Genres, 3: Movies, 4: Languages, 5: Done (Radar)
  
  // Custom temporary profile for Step 5
  const [tempProfile, setTempProfile] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, []);

  useEffect(() => {
    if (step === 3) {
      fetchMoviesFilteredByGenres();
    }
  }, [step]);

  const fetchMoviesFilteredByGenres = async () => {
    setLoadingMovies(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // Fetch trending popular movies filtered by selected genres
      let url = `${API}/api/v1/movies/trending-all`;
      if (selectedGenres.length > 0) {
        url = `${API}/api/v1/movies/discover?genre=${encodeURIComponent(selectedGenres[0].toLowerCase())}&limit=24`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMovies(data.results || data || []);
      }
    } catch (err) {
      console.error("Error fetching onboarding movies:", err);
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
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      await authFetch(`${API}/api/v1/users/onboard`, {
        method: "POST",
        body: JSON.stringify({
          user_id: user?.id,
          liked_movies: selectedMovies,
          pref_genres: selectedGenres,
          pref_languages: selectedLanguages
        }),
      });

      // Prepare local TasteDNA mock structure for preview
      setTempProfile({
        top_genres: selectedGenres.map((g, idx) => [g, 10 - idx]),
        preferred_decades: [["2020", 8], ["2010", 6]],
        top_directors: [["Christopher Nolan", 3], ["Denis Villeneuve", 2]],
        language_preferences: selectedLanguages.map((l) => [l, 5]),
        avg_runtime_preference: 124,
        rating_threshold: 7.5
      });

      setStep(5);
    } catch (err) {
      console.error("Failed to submit onboarding selections:", err);
    } finally {
      setSaving(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 1.02, transition: { duration: 0.3 } }
  };

  return (
    <main className="min-h-screen bg-black pt-28 pb-16 px-4 overflow-hidden relative text-white">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[var(--accent-warm)]/[0.03] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[var(--accent-rose)]/[0.03] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl relative z-10">
        {/* Progress indicator */}
        {step < 5 && (
          <div className="flex justify-between items-center mb-12 max-w-md mx-auto">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                    step === s
                      ? "bg-[var(--accent-warm)] text-black border-[var(--accent-warm)] shadow-[0_0_15px_rgba(232,168,73,0.3)] scale-115"
                      : step > s
                      ? "bg-[var(--accent-rose)] text-white border-[var(--accent-rose)]"
                      : "bg-zinc-950 text-zinc-500 border-zinc-800"
                  }`}
                >
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${
                      step > s ? "bg-[var(--accent-rose)]" : "bg-zinc-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="text-center max-w-2xl mx-auto space-y-8"
            >
              <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-black shadow-[0_0_24px_rgba(232,168,73,0.25)]">
                <Sparkles className="h-10 w-10 animate-pulse" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-playfair">
                Sequence Your Taste DNA
              </h1>
              <p className="text-zinc-400 text-base leading-relaxed">
                NeuralFlix calibrates recommendations based on vector mappings of your cinematic profile. Answer a few choices to bootstrap your neural model.
              </p>
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] px-8 py-4 text-xs font-black text-black shadow-lg hover:brightness-110 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider font-mono"
              >
                Let&apos;s build your Taste DNA
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
              className="space-y-8 animate-fade-in"
            >
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight font-playfair text-white">Select Favorite Genres</h2>
                <p className="text-sm text-zinc-400">
                  Pick at least 3 genres. Your selection creates your primary coordinate embeddings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6 max-w-4xl mx-auto">
                {AVAILABLE_GENRES.map((g) => {
                  const active = selectedGenres.includes(g.name);
                  return (
                    <button
                      key={g.name}
                      onClick={() => toggleGenre(g.name)}
                      className={`p-4 rounded-xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-end h-28 relative overflow-hidden group ${
                        active
                          ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white scale-[1.02] shadow-[0_0_15px_rgba(232,168,73,0.15)]"
                          : "border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {/* Image background */}
                      <img src={g.image} alt={g.name} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                      
                      <span className="text-2xl filter drop-shadow-md z-20 mb-2">{g.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono z-20">
                        {g.name}
                      </span>
                      {active && (
                        <div className="absolute right-2 top-2 rounded-full bg-[var(--accent-warm)] p-0.5 text-black z-20">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center max-w-md mx-auto pt-6 border-t border-zinc-900">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-mono"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-xs font-semibold text-zinc-500 font-mono">
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
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight font-playfair text-white">Select films you love</h2>
                <p className="text-sm text-zinc-400">
                  Pick 5+ movies. We query these against collaborative filters to calibrate taste profiles.
                </p>
              </div>

              {loadingMovies ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                    Searching vector databases...
                  </p>
                </div>
              ) : movies.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl max-w-md mx-auto">
                  <Film className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
                  <p className="text-sm font-semibold text-white">No matches found</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Check backend seeds or choose general categories.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                  {movies.map((movie) => {
                    const active = selectedMovies.includes(movie.tmdb_id || movie._id);
                    return (
                      <button
                        key={movie.tmdb_id || movie._id}
                        onClick={() => toggleMovie(movie.tmdb_id || movie._id)}
                        className={`group relative aspect-[2/3] overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                          active
                            ? "border-[var(--accent-warm)] ring-4 ring-[var(--accent-warm)]/10 scale-[0.98]"
                            : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.01]"
                        }`}
                      >
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center p-4">
                            <span className="text-xs font-semibold text-zinc-500 text-center">
                              {movie.title}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="absolute bottom-3 left-3 right-3 text-left z-20">
                          <p className="text-[10px] font-bold text-white line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                            {movie.title}
                          </p>
                        </div>
                        {active && (
                          <div className="absolute right-3 top-3 rounded-full bg-[var(--accent-warm)] p-1 text-black shadow-lg">
                            <Check className="h-4.5 w-4.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center max-w-md mx-auto pt-6 border-t border-zinc-900">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-mono"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-xs font-semibold text-zinc-500 font-mono">
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
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight font-playfair text-white">Language preferences</h2>
                <p className="text-sm text-zinc-400">
                  Which languages do you watch in? (Multi-select)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 max-w-3xl mx-auto">
                {AVAILABLE_LANGUAGES.map((l) => {
                  const active = selectedLanguages.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      onClick={() => toggleLanguage(l.code)}
                      className={`p-4 rounded-xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-2 relative ${
                        active
                          ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white scale-[1.02] shadow-[0_0_15px_rgba(232,168,73,0.15)]"
                          : "border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-3xl filter drop-shadow-md">{l.flag}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
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

              <div className="flex justify-between items-center max-w-md mx-auto pt-6 border-t border-zinc-900">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-mono"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <div className="text-xs font-semibold text-zinc-500 font-mono">
                  {selectedLanguages.length} selected
                </div>
                <button
                  onClick={handleFinish}
                  disabled={selectedLanguages.length < 1 || saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] px-6 py-3.5 text-xs font-black text-black hover:brightness-110 disabled:opacity-30 disabled:scale-100 disabled:brightness-100 hover:scale-[1.02] cursor-pointer uppercase tracking-wider shadow-[0_0_24px_rgba(232,168,73,0.25)] font-mono"
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

          {step === 5 && (
            <motion.div
              key="step5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="text-center space-y-8 max-w-3xl mx-auto"
            >
              <div className="space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-black animate-bounce">
                  <Check className="h-6 w-6" />
                </div>
                <h2 className="text-4xl font-extrabold font-playfair text-white tracking-tight">Your neural engine is ready</h2>
                <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                  We mapped your film profile into our vector space. An overview of your calibrated Taste DNA is displayed below.
                </p>
              </div>

              {/* Render local mockup TasteDNA */}
              <div className="border border-zinc-900 rounded-3xl p-6 bg-zinc-950/40 backdrop-blur-md">
                <TasteDNA profile={tempProfile} loading={false} />
              </div>

              <div>
                <button
                  onClick={() => router.push("/recommendations")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] px-10 py-4 text-xs font-black text-black shadow-[0_0_24px_rgba(232,168,73,0.3)] hover:brightness-110 active:scale-95 transition-all cursor-pointer uppercase tracking-widest font-mono"
                >
                  Enter Dashboard
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

