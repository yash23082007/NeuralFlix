"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Compass,
  Film,
  Globe2,
  SlidersHorizontal,
  Grid,
  List,
  Calendar,
  Star,
  RefreshCw,
  X,
  Sparkles,
  Heart,
  ChevronUp,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MovieCard, { Movie } from "../../components/MovieCard";
import ScrollReveal from "../../components/ScrollReveal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GENRES = [
  "Action", "Comedy", "Drama", "Horror", "Romance", "Science Fiction",
  "Thriller", "Animation", "Adventure", "Crime", "Fantasy", "Mystery", "Documentary",
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" }
];

const MOODS = [
  { label: "Chill", genres: ["Comedy", "Romance"] },
  { label: "Intense", genres: ["Thriller", "Horror", "Crime"] },
  { label: "Thoughtful", genres: ["Drama", "Mystery", "Documentary"] },
  { label: "Exciting", genres: ["Action", "Adventure", "Science Fiction"] }
];

const SORT_OPTIONS = [
  { label: "Popularity", value: "popularity" },
  { label: "Rating", value: "rating" },
  { label: "Year", value: "year" },
  { label: "Votes", value: "votes" }
];

function DiscoverContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Load initial state from URL parameters
  const getInitialFilters = () => {
    return {
      genres: searchParams.get("genres") ? searchParams.get("genres")!.split(",") : [],
      language: searchParams.get("language") || "",
      yearFrom: searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!) : 1900,
      yearTo: searchParams.get("yearTo") ? parseInt(searchParams.get("yearTo")!) : new Date().getFullYear(),
      minRating: searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : 0.0,
      sort: searchParams.get("sort") || "popularity"
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const initialMount = useRef(true);

  // Sync state changes with URL query parameters
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (filters.genres.length > 0) params.set("genres", filters.genres.join(","));
    if (filters.language) params.set("language", filters.language);
    if (filters.yearFrom !== 1900) params.set("yearFrom", String(filters.yearFrom));
    const currentYear = new Date().getFullYear();
    if (filters.yearTo !== currentYear) params.set("yearTo", String(filters.yearTo));
    if (filters.minRating !== 0.0) params.set("minRating", String(filters.minRating));
    if (filters.sort !== "popularity") params.set("sort", filters.sort);

    const query = params.toString();
    window.history.replaceState(null, "", `${pathname}${query ? "?" + query : ""}`);
  }, [filters, pathname]);

  // Fetch movies from unified endpoint
  const fetchMovies = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (filters.genres.length > 0) params.set("genres", filters.genres.join(","));
      if (filters.language) params.set("language", filters.language);
      params.set("year_from", String(filters.yearFrom));
      params.set("year_to", String(filters.yearTo));
      params.set("min_rating", String(filters.minRating));
      params.set("sort", filters.sort);
      params.set("page", String(pageNum));
      params.set("limit", "24");

      const res = await fetch(`${API_BASE}/api/v1/movies/filter?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        setTotalResults(data.total || 0);
        setTotalPages(data.total_pages || 1);

        if (append) {
          setMovies((prev) => {
            // Deduplicate movies by tmdb_id
            const existingIds = new Set(prev.map(m => m.tmdb_id));
            const newMovies = results.filter((m: Movie) => !existingIds.has(m.tmdb_id));
            return [...prev, ...newMovies];
          });
        } else {
          setMovies(results);
        }
      }
    } catch (err) {
      console.error("Error discovering movies:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  // Refetch when filters change
  useEffect(() => {
    setPage(1);
    fetchMovies(1, false);
  }, [filters, fetchMovies]);

  // Load next pages on scroll (Intersection Observer)
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMovies(nextPage, true);
        }
      },
      { rootMargin: "250px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [page, totalPages, loading, loadingMore, fetchMovies]);

  // Filter modifiers
  const toggleGenre = (genre: string) => {
    setSelectedMood(null);
    setFilters((prev) => {
      const genres = prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre];
      return { ...prev, genres };
    });
  };

  const setLanguage = (langCode: string) => {
    setFilters((prev) => ({ ...prev, language: langCode }));
  };

  const applyMood = (moodName: string, moodGenres: string[]) => {
    setSelectedMood(moodName);
    setFilters((prev) => ({ ...prev, genres: moodGenres }));
  };

  const resetFilters = () => {
    setSelectedMood(null);
    setFilters({
      genres: [],
      language: "",
      yearFrom: 1900,
      yearTo: new Date().getFullYear(),
      minRating: 0.0,
      sort: "popularity"
    });
  };

  const savePreset = () => {
    localStorage.setItem("nf_discover_preset", JSON.stringify(filters));
    alert("Filter coordinates pinned successfully!");
  };

  const loadPreset = () => {
    const saved = localStorage.getItem("nf_discover_preset");
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      alert("No preset found. Pin a preset first!");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.02 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] pt-28 pb-20">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        
        {/* Hub Header */}
        <ScrollReveal>
          <header className="mb-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
            {/* Ambient decorative glow */}
            <div className="absolute top-0 right-0 w-[30%] h-[150%] pointer-events-none opacity-20 blur-[85px] bg-gradient-to-br from-[var(--accent-warm)] to-transparent" />
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--accent-warm)] uppercase">
                  <Compass className="h-4 w-4 animate-pulse" />
                  Telemetry Explore
                </div>
                <h1 className="text-3xl font-extrabold text-[var(--text-primary)] md:text-4xl font-playfair tracking-tight">
                  Global Discovery
                </h1>
                <p className="mt-2 max-w-xl text-xs text-[var(--text-secondary)] font-sans">
                  Query the high-dimensional movie catalog. Refine vectors by genre weight, language origins, release era, and rating threshold.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-center sm:w-auto">
                {[
                  { label: "Matches", value: totalResults.toLocaleString() },
                  { label: "Langs", value: LANGUAGES.length },
                  { label: "Genres", value: GENRES.length }
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-4 py-3 min-w-[80px]"
                  >
                    <div className="text-sm font-bold text-[var(--text-primary)] font-mono">
                      {s.value}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] font-sans">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </header>
        </ScrollReveal>

        {/* Action Toggle controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer font-sans"
            >
              <SlidersHorizontal className="h-4 w-4 text-[var(--accent-warm)]" />
              {filtersOpen ? "Collapse Console" : "Expand Console"}
            </button>
            <button
              onClick={savePreset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/20 px-3 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer font-sans"
            >
              Pin Preset
            </button>
            <button
              onClick={loadPreset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/20 px-3 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer font-sans"
            >
              Restore Pin
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-[var(--surface-elevated)] p-1 border border-[var(--border-default)]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-[var(--surface-hover)] text-[var(--accent-warm)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "list" ? "bg-[var(--surface-hover)] text-[var(--accent-warm)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent-rose)]/20 bg-[var(--accent-rose)]/5 px-3 py-2.5 text-xs font-semibold text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/15 transition-all cursor-pointer font-sans"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          </div>
        </div>

        {/* Bento Console Filters */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.section
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 p-6 backdrop-blur-sm">
                
                {/* Genres Column (Col span 7) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 font-sans">
                      GENRE COORDINATE VECTOR
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((g) => {
                        const active = filters.genres.includes(g);
                        return (
                          <button
                            key={g}
                            onClick={() => toggleGenre(g)}
                            className={`px-3 py-1.5 text-xs rounded-xl border font-sans uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                              active
                                ? "bg-[var(--accent-warm)] text-black border-[var(--accent-warm)] font-bold shadow-[0_0_12px_var(--accent-warm-glow)] scale-[1.02]"
                                : "bg-[var(--surface-overlay)]/40 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-warm)]/40"
                            }`}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Moods quick pick */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 font-sans">
                      EMOTIONAL SPECTRUM MOOD BIAS (QUICK FILTER)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {MOODS.map((m) => {
                        const active = selectedMood === m.label;
                        return (
                          <button
                            key={m.label}
                            onClick={() => applyMood(m.label, m.genres)}
                            className={`px-3.5 py-1.5 text-xs rounded-xl border font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 font-sans ${
                              active
                                ? "bg-[var(--accent-rose)] text-white border-[var(--accent-rose)] shadow-[0_0_12px_var(--accent-rose-glow)]"
                                : "bg-[var(--surface-overlay)]/20 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-rose)]/40"
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Slider and language filters Column (Col span 5) */}
                <div className="lg:col-span-5 space-y-6 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-6 lg:pt-0 lg:pl-6">
                  
                  {/* Languages Selector */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 font-sans">
                      CATALOG ORIGIN LANGUAGE
                    </h3>
                    <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                      <button
                        onClick={() => setLanguage("")}
                        className={`px-2 py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center font-sans uppercase tracking-wider ${
                          !filters.language
                            ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-[var(--text-primary)]"
                            : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                        }`}
                      >
                        🌐 ALL
                      </button>
                      {LANGUAGES.map((l) => {
                        const active = filters.language === l.code;
                        return (
                          <button
                            key={l.code}
                            onClick={() => setLanguage(l.code)}
                            className={`px-2 py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center font-sans ${
                              active
                                ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-[var(--text-primary)]"
                                : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                            }`}
                          >
                            {l.flag} {l.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Year range slider & Rating Slider */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Year selection */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex justify-between font-sans">
                        <span>TEMPORAL ERA</span>
                        <span className="font-mono text-[var(--text-secondary)]">
                          {filters.yearFrom} - {filters.yearTo}
                        </span>
                      </h3>
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={filters.yearFrom}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              yearFrom: Math.min(parseInt(e.target.value), prev.yearTo)
                            }))
                          }
                          className="w-full h-1 bg-[var(--surface-overlay)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-warm)]"
                        />
                        <input
                          type="range"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={filters.yearTo}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              yearTo: Math.max(parseInt(e.target.value), prev.yearFrom)
                            }))
                          }
                          className="w-full h-1 bg-[var(--surface-overlay)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-rose)]"
                        />
                      </div>
                    </div>

                    {/* Minimum Rating */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex justify-between font-sans">
                        <span>MINIMUM RATING</span>
                        <span className="font-mono text-[var(--accent-warm)] flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-current" /> {filters.minRating.toFixed(1)}
                        </span>
                      </h3>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={filters.minRating}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            minRating: parseFloat(e.target.value)
                          }))
                        }
                        className="w-full h-1 bg-[var(--surface-overlay)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-warm)]"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Sort & Telemetry Stats bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-4">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider font-mono">
            {loading ? "Re-ordering vectors..." : `Catalog matches: ${totalResults.toLocaleString()}`}
          </p>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider font-sans">
              Sort Sequence
            </span>
            <div className="flex gap-1.5 rounded-xl bg-[var(--surface-elevated)] p-1 border border-[var(--border-default)]">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilters((prev) => ({ ...prev, sort: opt.value }))}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer font-sans uppercase tracking-wider ${
                    filters.sort === opt.value
                      ? "bg-[var(--accent-warm)] text-black shadow-sm"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Movie Results Display */}
        {loading && movies.length === 0 ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton aspect-[2/3] rounded-2xl" />
                <div className="skeleton h-3.5 w-4/5 rounded-lg" />
                <div className="skeleton h-3 w-3/5 rounded-lg" />
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          viewMode === "grid" ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              {movies.map((movie) => (
                <motion.div key={movie.tmdb_id} variants={itemVariants}>
                  <MovieCard movie={movie} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {movies.map((movie) => (
                <motion.div
                  key={movie.tmdb_id}
                  variants={itemVariants}
                  className="flex gap-4 p-4 rounded-2xl bg-[var(--surface-elevated)]/30 border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]/20 transition-all hover:scale-[1.005]"
                >
                  <div className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-[var(--border-default)]">
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--surface-muted)] flex items-center justify-center p-2 text-center text-[8px]">
                        {movie.title}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-bold text-[var(--text-primary)] font-playfair hover:text-[var(--accent-warm)] transition-colors">
                          {movie.title}
                        </h3>
                        <span className="text-[10px] font-mono text-[var(--accent-warm)] flex items-center gap-0.5 font-bold">
                          <Star className="h-3 w-3 fill-current" /> {movie.rating?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-2 font-sans">
                        {movie.overview || "No overview available for this title catalog entry."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center mt-3">
                      {movie.year && (
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-mono border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                          {movie.year}
                        </span>
                      )}
                      {movie.language && (
                        <span className="text-[10px] font-bold text-[var(--text-tertiary)] font-sans border border-[var(--border-subtle)] rounded px-1.5 py-0.5 uppercase">
                          {movie.language}
                        </span>
                      )}
                      {movie.genres?.slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="text-[9px] font-semibold text-[var(--accent-warm)] bg-[var(--accent-warm)]/10 rounded-full px-2 py-0.5 uppercase tracking-wide"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )
        ) : (
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 py-24 text-center backdrop-blur-sm">
            <Film className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)] opacity-60 animate-pulse" />
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-sans">No Movies Match Coordinate Search</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm mx-auto font-sans">
              No titles match your selected filters. Adjust your year ranges, rating values, or genres.
            </p>
          </div>
        )}

        {/* Infinite Scroll Sentinel element */}
        <div ref={sentinelRef} className="h-10 mt-12 flex items-center justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-warm)]" />
              <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider font-mono">
                Querying next coordinate offset...
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--surface-primary)] pt-28 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
            <p className="text-sm text-[var(--text-secondary)] font-sans uppercase tracking-wider">Loading discovery database...</p>
          </div>
        </main>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}

// Add simple Loader2 fallback since it isn't imported from lucide-react in parent scope
function Loader2({ className }: { className?: string }) {
  return <RefreshCw className={className} />;
}
