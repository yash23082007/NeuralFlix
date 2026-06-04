"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkles, Film, Heart, Brain, Coffee, AlertCircle, Award, Compass, Music, Flame } from "lucide-react";
import MovieCard from "../MovieCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MOODS = [
  { id: "intense", label: "Intense", icon: "⚡", gradient: "from-red-600 via-orange-600 to-yellow-500", desc: "Thrillers, crime, and high-stakes drama" },
  { id: "chill", label: "Chill", icon: "🌊", gradient: "from-sky-500 via-blue-600 to-indigo-600", desc: "Relaxing, ambient, feel-good movies" },
  { id: "funny", label: "Funny", icon: "😆", gradient: "from-yellow-400 via-amber-500 to-orange-500", desc: "Comedies, satires, and lighthearted fun" },
  { id: "scary", label: "Scary", icon: "💀", gradient: "from-neutral-900 via-red-950 to-neutral-900", desc: "Horror, psychological terror, and suspense" },
  { id: "romantic", label: "Romantic", icon: "💖", gradient: "from-pink-500 via-rose-500 to-red-500", desc: "Romance, dramas, and love stories" },
  { id: "thoughtful", label: "Thoughtful", icon: "🧠", gradient: "from-emerald-500 via-teal-600 to-cyan-600", desc: "Philosophical, complex, and art-house films" },
  { id: "epic", label: "Epic", icon: "👑", gradient: "from-violet-600 via-purple-600 to-amber-500", desc: "Sci-Fi epics, fantasy, and blockbusters" },
  { id: "sad", label: "Sad", icon: "💧", gradient: "from-slate-700 via-slate-800 to-cyan-900", desc: "Melodramas, tragedies, and emotional journeys" }
];

const LANGUAGES = [
  { code: "", name: "All Languages", flag: "🌍" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" }
];

export function MoodSelector() {
  const [selectedMood, setSelectedMood] = useState<string | null>("intense");
  const [selectedLang, setSelectedLang] = useState<string>("");
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMood) {
      setMovies([]);
      return;
    }

    const fetchMoodMovies = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/movies/mood/${selectedMood}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.results || []);
        }
      } catch (error) {
        console.error("Failed to fetch mood movies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodMovies();
  }, [selectedMood]);

  // Filter movies by language and limit to 20 results
  const filteredMovies = movies
    .filter((m) => !selectedLang || m.language === selectedLang)
    .slice(0, 20);

  const activeMoodInfo = MOODS.find((m) => m.id === selectedMood);

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="space-y-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-[var(--accent-warm)] uppercase font-mono bg-[var(--accent-warm)]/10 px-3 py-1 rounded-full border border-[var(--accent-warm)]/20">
          <Sparkles className="h-3 w-3 animate-spin" /> Neural Mood Mapping
        </span>
        <h1 className="text-4xl font-extrabold text-white font-playfair tracking-tight">Preferential Mood Alignment</h1>
        <p className="text-sm leading-relaxed text-zinc-400 max-w-xl">
          Calibrate the recommendations using emotional filters. Shift genres, novelty offsets, and aesthetic pacing coordinates dynamically.
        </p>
      </header>

      {/* Grid of 8 Mood Cards */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {MOODS.map((mood) => {
          const active = selectedMood === mood.id;
          return (
            <motion.button
              key={mood.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMood(mood.id)}
              className={`rounded-2xl border p-5 text-left transition-all relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer ${
                active
                  ? `border-[var(--accent-warm)] bg-gradient-to-br ${mood.gradient} text-white shadow-[0_0_24px_rgba(232,168,73,0.15)]`
                  : "border-zinc-900 bg-zinc-950/60 text-zinc-400 hover:border-zinc-800"
              }`}
            >
              {/* Dynamic light rays if active */}
              {active && (
                <div className="absolute inset-0 bg-white/5 mix-blend-overlay pointer-events-none animate-pulse" />
              )}

              <div className="flex items-center justify-between">
                <span className="text-3xl filter drop-shadow-md">{mood.icon}</span>
                {active && (
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                )}
              </div>

              <div className="space-y-1 z-10">
                <h3 className={`text-base font-black uppercase tracking-wider ${active ? "text-white" : "text-white/90"}`}>
                  {mood.label}
                </h3>
                <p className={`text-[10px] line-clamp-2 leading-relaxed ${active ? "text-white/80 font-medium" : "text-zinc-500"}`}>
                  {mood.desc}
                </p>
              </div>
            </motion.button>
          );
        })}
      </section>

      {/* Filters row: Language */}
      {selectedMood && (
        <section className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mr-2">Language Lens</span>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedLang === lang.code
                    ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white"
                    : "border-zinc-900 bg-zinc-950/20 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
                }`}
              >
                <span className="mr-1.5">{lang.flag}</span>
                {lang.name}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {filteredMovies.length} of {movies.length} Results
          </span>
        </section>
      )}

      {/* Movies Results Grid */}
      <section className="space-y-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[2/3] bg-zinc-950 border border-zinc-900 rounded-2xl" />
                  <div className="h-4 bg-zinc-900 w-4/5 rounded-md" />
                  <div className="h-3.5 bg-zinc-900 w-3/5 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredMovies.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              {filteredMovies.map((movie) => (
                <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
              ))}
            </motion.div>
          ) : selectedMood ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center border border-dashed border-zinc-900 rounded-2xl max-w-md mx-auto"
            >
              <AlertCircle className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">No matches in language lens</h4>
              <p className="text-xs text-zinc-500 mt-1">
                There are no cached titles matching {activeMoodInfo?.label} in the selected language. Try another filter.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </div>
  );
}

