"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, RefreshCw, Compass, Moon, Globe, Zap, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TasteDNA from "../../components/TasteDNA";
import MovieCard from "../../components/MovieCard";
import TasteConstellation, { TasteControls } from "../../components/recommendation/TasteConstellation";
import { getUser, authFetch } from "../../lib/auth";

interface Movie {
  tmdb_id: number;
  id?: number;
  title: string;
  poster_url?: string;
  genres?: string[];
  rating?: number;
  rec_score?: number;
  popularity_score?: number;
  year?: number;
  language?: string;
  cinema_region?: string;
  explanation?: string;
}

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Science Fiction", "Romance", "Thriller", "Animation", "Documentary"];
const MODES = [
  { id: "for_you", label: "For You", icon: Sparkles, desc: "Personalized taste blend" },
  { id: "hidden_gems", label: "Hidden Gems", icon: Compass, desc: "Acclaimed indie & world cinema" },
  { id: "tonight", label: "Watch Tonight", icon: Moon, desc: "Brisk runtime under 2 hours" },
  { id: "outside_bubble", label: "Outside Comfort Zone", icon: Globe, desc: "International cinema discoveries" },
];

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<string>("for_you");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tasteProfile, setTasteProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [servedBy, setServedBy] = useState<string>("deterministic-taste-v1");

  useEffect(() => {
    const user = getUser();
    if (user?.id) {
      setUserId(user.id);
    } else {
      setLoading(false);
      setProfileLoading(false);
    }
  }, [searchParams]);

  // Fetch Taste Profile Profile
  useEffect(() => {
    async function fetchTasteProfile() {
      if (!userId) return;
      setProfileLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await authFetch(`${apiBase}/api/v1/users/me/profile`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) setTasteProfile(data.profile);
        }
      } catch (err) {
        console.error("Error fetching taste profile:", err);
      } finally {
        setProfileLoading(false);
      }
    }
    fetchTasteProfile();
  }, [userId]);

  const fetchRecommendations = useCallback(
    async (mode = activeMode) => {
      if (!userId) return;
      setLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const params = new URLSearchParams({ top_k: "24", mode });
        if (selectedGenres.length) params.set("genres", selectedGenres.join(","));
        if (selectedMood) params.set("mood", selectedMood);

        const recsRes = await authFetch(`${apiBase}/api/v1/recommendations/feed?` + params);
        if (recsRes.ok) {
          const recsData = await recsRes.json();
          setRecommendations(recsData.recommendations || []);
          if (recsData.served_by) setServedBy(recsData.served_by);
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId, activeMode, selectedGenres, selectedMood]
  );

  useEffect(() => {
    fetchRecommendations(activeMode);
  }, [activeMode, selectedGenres, selectedMood, fetchRecommendations]);

  const handleControlsChange = (controls: TasteControls) => {
    // When sliders move, re-query with current mode to reflect new weights
    fetchRecommendations(activeMode);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleDismiss = (mId: number) => {
    setRecommendations((prev) => prev.filter((m) => Number(m.id || m.tmdb_id) !== mId));
  };

  if (!userId && !loading && !profileLoading) {
    return (
      <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden pb-24 pt-28 flex items-center justify-center">
        <div className="relative z-10 max-w-md w-full mx-auto px-6 text-center py-16 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-3xl shadow-2xl">
          <Sparkles className="w-10 h-10 text-[var(--accent-warm)] mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold font-playfair mb-2">Authentication Required</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-6">
            Sign in to access your personalized Taste Profile feed and mathematical recommendations.
          </p>
          <a
            href="/login"
            className="inline-block bg-[var(--accent-warm)] text-black font-bold px-7 py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-glow text-xs uppercase tracking-wider"
          >
            Sign In / Register
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden pb-24 pt-28">
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-[var(--border-subtle)] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--accent-warm)] uppercase">
              <Sparkles className="h-3 w-3" />
              Taste Intelligence Engine
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-playfair text-[var(--text-primary)]">
              Personalized Recommendations
            </h1>
            <p className="text-xs text-[var(--text-tertiary)] max-w-xl">
              Transparent, user-steerable scoring with per-feature mathematical attributions.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-tertiary)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">Active Tier: {servedBy}</span>
          </div>
        </div>

        {/* Layout Grid: Taste Profile (Controls) + Recs Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: Taste Profile & DNA */}
          <div className="lg:col-span-4 space-y-6">
            {/* The Signature Taste Profile Component */}
            <TasteConstellation onControlsChange={handleControlsChange} />

            {/* Inferred Taste Profile */}
            {tasteProfile && (
              <div className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] p-5 shadow-lg">
                <TasteDNA profile={tasteProfile} />
              </div>
            )}
          </div>

          {/* Right Main Column: Mode Tabs, Genre Chips, and Recommendations Grid */}
          <div className="lg:col-span-8 space-y-6">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveMode(m.id)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      active
                        ? "bg-[var(--surface-elevated)] border-[var(--accent-warm)] shadow-md text-[var(--text-primary)]"
                        : "bg-[var(--surface-primary)] border-[var(--border-subtle)] hover:border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${active ? "text-[var(--accent-warm)]" : "text-[var(--text-tertiary)]"}`} />
                      <span className="text-xs font-bold">{m.label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] mt-1 line-clamp-1">{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Genre Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1 pr-1 shrink-0">
                <Filter className="h-3 w-3" /> Filter:
              </span>
              {GENRES.map((g) => {
                const active = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium shrink-0 transition-colors border ${
                      active
                        ? "bg-[var(--accent-warm)]/15 border-[var(--accent-warm)] text-[var(--accent-warm)]"
                        : "bg-[var(--surface-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {/* Recommendations Grid */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-7 w-7 animate-spin text-[var(--accent-warm)]" />
                <span className="text-xs text-[var(--text-tertiary)]">Calibrating candidate vectors...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center text-xs text-[var(--text-tertiary)]">
                No titles matched your specific filter combination. Try clearing genre filters or moving the discovery slider.
              </div>
            ) : (
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {recommendations.map((movie) => (
                  <MovieCard
                    key={movie.tmdb_id || movie.id}
                    movie={movie}
                    onDismiss={handleDismiss}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[var(--surface-primary)]">
          <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
        </div>
      }
    >
      <RecommendationsContent />
    </Suspense>
  );
}
