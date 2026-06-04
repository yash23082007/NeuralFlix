"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Sparkles, RefreshCw, Cpu, Activity, ListFilter, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TasteDNA from "../../components/TasteDNA";
import MovieCard from "../../components/MovieCard";
import ScrollReveal from "../../components/ScrollReveal";
import { getUser, authFetch } from "../../lib/auth";

interface Movie {
  tmdb_id: number;
  title: string;
  poster_url?: string;
  genres?: string[];
  rating?: number;
  rec_score?: number;
  popularity_score?: number;
  year?: number;
  language?: string;
  cinema_region?: string;
}

const GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Animation", "Documentary"];
const MOODS = ["Exciting", "Chill", "Thoughtful", "Funny", "Intense", "Romantic"];
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function RecommendationsContent() {
  const searchParams = useSearchParams();
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "popularity" | "year">("score");
  const [tasteProfile, setTasteProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initialize user ID from auth state or search params
  useEffect(() => {
    const user = getUser();
    if (user?.id) {
      setUserId(user.id);
    } else {
      const queryUserId = searchParams.get("user_id");
      if (queryUserId) {
        setUserId(queryUserId);
      } else {
        setLoading(false);
        setProfileLoading(false);
      }
    }
  }, [searchParams]);

  // Fetch user taste profile
  useEffect(() => {
    async function fetchTasteProfile() {
      if (!userId) {
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const res = await authFetch(`${API}/api/v1/users/${userId}/profile`);
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
    async (pageNum: number, append = false) => {
      if (!userId) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ top_k: "20", page: String(pageNum) });
        if (selectedGenres.length) params.set("genres", selectedGenres.join(","));
        if (selectedMood) params.set("mood", selectedMood);
        if (selectedLanguage) params.set("language", selectedLanguage);
        params.set("sort", sortBy);

        const recsRes = await authFetch(`${API}/api/v1/recommendations/user/${userId}?` + params);
        if (recsRes.ok) {
          const recsData = await recsRes.json();
          const movies = (recsData.recommendations || []).map((m: any) => ({
            ...m,
            rec_score: m.score != null ? m.score : 0.85,
          }));
          if (append) {
            setRecommendations((prev) => [...prev, ...movies]);
          } else {
            setRecommendations(movies);
          }
          setHasMore(movies.length === 20);
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId, selectedGenres, selectedMood, selectedLanguage, sortBy]
  );

  useEffect(() => {
    setPage(1);
    fetchRecommendations(1);
  }, [selectedGenres, selectedMood, selectedLanguage, sortBy, fetchRecommendations]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) fetchRecommendations(page, true);
  }, [page, fetchRecommendations]);

  // Websocket telemetry updates
  useEffect(() => {
    if (!userId) return;
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${API.replace(/^https?:\/\//, "")}/ws/recommendations/${userId}`;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setStreaming(true);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "recommendations_update" && msg.data) {
            setRecommendations(
              msg.data.slice(0, 20).map((m: any) => ({
                ...m,
                rec_score: m.score != null ? m.score : 0.85,
              }))
            );
          }
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };
      ws.onclose = () => setStreaming(false);
    } catch (err) {
      console.error("Error connecting WS:", err);
    }
    return () => {
      ws?.close();
      setStreaming(false);
    };
  }, [userId]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
  };

  if (!userId && !loading && !profileLoading) {
    return (
      <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden pb-24 pt-28 flex items-center justify-center">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative z-10 max-w-md w-full mx-auto px-6 text-center py-20 bg-[var(--surface-elevated)]/40 border border-[var(--border-subtle)] rounded-3xl backdrop-blur-md glass-card">
          <Sparkles className="w-12 h-12 text-[var(--accent-warm)] mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold font-playfair mb-3">Authentication Required</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Log in to access your personalized Neural Engine curation, watch history, and Taste DNA.
          </p>
          <a
            href="/login"
            className="inline-block bg-[var(--accent-warm)] text-black font-semibold px-8 py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-glow uppercase tracking-wider text-xs font-sans"
          >
            Sign In / Register
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden pb-24 pt-28">
      {/* Telemetry/Neural background grids */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full opacity-40 blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(232,168,73,0.05) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10 border-b border-[var(--border-subtle)] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--accent-warm)] uppercase">
              <Cpu className="h-3.5 w-3.5 animate-pulse" />
              Neural Engine Hub
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight font-playfair flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-[var(--accent-warm)] animate-pulse" />
              Machine Learning Curation
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-sans max-w-xl">
              Cinematic coordinate vectors calculated dynamically using collaborative filtering matrices and user taste profiles.
            </p>
          </div>

          <AnimatePresence>
            {streaming && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/20 rounded-full"
              >
                <span className="w-2 h-2 bg-[var(--accent-warm)] rounded-full animate-ping" />
                <span className="text-[9px] font-bold text-[var(--accent-warm)] uppercase tracking-wider font-sans">
                  Real-time Neural Link
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Taste DNA Section */}
        <ScrollReveal className="mb-10">
          <TasteDNA profile={tasteProfile} loading={profileLoading} />
        </ScrollReveal>

        {/* Filter Panel (Glass Bento Console) */}
        <ScrollReveal className="mb-10">
          <div className="bg-[var(--surface-elevated)]/40 border border-[var(--border-subtle)] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden glass-card">
            {/* Glowing accent orb */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-[var(--accent-warm)]/5 blur-xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-6 border-b border-[var(--border-subtle)] pb-3">
              <ListFilter className="w-4 h-4 text-[var(--accent-warm)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] font-sans">
                Algorithmic Refinement Panel
              </span>
            </div>

            <div className="space-y-6">
              {/* Genre Filter */}
              <div>
                <p className="text-[9px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3 font-sans">
                  Target Genre Coordinates
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => {
                    const active = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-3.5 py-1.5 text-xs rounded-xl border font-sans uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                          active
                            ? "bg-[var(--accent-warm)] text-black border-[var(--accent-warm)] font-bold shadow-[0_0_12px_var(--accent-warm-glow)]"
                            : "bg-[var(--surface-overlay)]/40 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-warm)]/40"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Emotional Bias */}
                <div>
                  <p className="text-[9px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3 font-sans">
                    Emotional Profile Bias (Mood)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => {
                      const active = selectedMood === mood;
                      return (
                        <button
                          key={mood}
                          onClick={() => setSelectedMood(active ? null : mood)}
                          className={`px-3.5 py-1.5 text-xs rounded-xl border font-sans uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            active
                              ? "bg-[var(--accent-rose)] text-white border-[var(--accent-rose)] font-bold shadow-[0_0_12px_var(--accent-rose-glow)]"
                              : "bg-[var(--surface-overlay)]/40 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-rose)]/40"
                          }`}
                        >
                          {mood}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Re-Rank Algorithm */}
                <div>
                  <p className="text-[9px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3 font-sans">
                    Matrix Re-Rank Algorithm
                  </p>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full max-w-xs px-4 py-2.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/60 text-[var(--text-primary)] font-sans uppercase tracking-wider focus:outline-none focus:border-[var(--accent-warm)] transition-colors cursor-pointer appearance-none"
                    >
                      <option value="score">Hybrid Neural Match Score</option>
                      <option value="popularity">Global Popularity Index</option>
                      <option value="year">Temporal Archiving (Year)</option>
                    </select>
                    {/* Select indicator */}
                    <div className="absolute right-[calc(100%-8rem)] top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Language Filter */}
                <div>
                  <p className="text-[9px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3 font-sans">
                    Language Filter
                  </p>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full max-w-xs px-4 py-2.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/60 text-[var(--text-primary)] font-sans uppercase tracking-wider focus:outline-none focus:border-[var(--accent-warm)] transition-colors cursor-pointer appearance-none"
                    >
                      <option value="">All Languages</option>
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="ko">Korean</option>
                      <option value="ja">Japanese</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                    </select>
                    {/* Select indicator */}
                    <div className="absolute right-[calc(100%-8rem)] top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Recommendations Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-playfair tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--accent-warm)]" />
              Calculated Curation Output
            </h2>
            <button
              onClick={() => {
                setPage(1);
                fetchRecommendations(1);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[var(--accent-warm)] hover:text-[var(--accent-rose)] transition-colors duration-200 cursor-pointer uppercase font-sans"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recalculate Matrix
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loading && recommendations.length === 0 ? (
              <div className="flex justify-center py-24">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-warm)]/10 border-t-[var(--accent-warm)] shadow-[0_0_15px_var(--accent-warm-glow)]" />
                    <Cpu className="absolute inset-0 m-auto h-4 w-4 text-[var(--accent-warm)] animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold tracking-wider text-[var(--text-tertiary)] uppercase animate-pulse font-sans">
                    Refactoring neural projection weights...
                  </p>
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
              >
                {recommendations.slice(0, 20).map((movie) => (
                  <motion.div key={movie.tmdb_id || (movie as any)._id} variants={itemVariants}>
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 py-24 text-center backdrop-blur-sm">
                <Cpu className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)] animate-pulse" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] font-sans">No Neural Recommendations Found</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto font-sans">
                  The recommended matrix returned empty. Try adjusting your genre coordinates, setting a different emotional bias, or checking back later.
                </p>
              </div>
            )}
          </AnimatePresence>

          <div ref={sentinelRef} className="h-4" />

          {loading && recommendations.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[var(--accent-warm)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--surface-primary)] pt-28 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-warm)] border-t-transparent" />
            <p className="text-sm text-[var(--text-secondary)] font-sans">Loading Recommendations...</p>
          </div>
        </main>
      }
    >
      <RecommendationsContent />
    </Suspense>
  );
}
