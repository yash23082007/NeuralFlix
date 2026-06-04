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
  LayoutGrid,
  Tv,
  Filter,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MovieCard, { Movie } from "../../components/MovieCard";
import ScrollReveal from "../../components/ScrollReveal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GENRES = [
  "Action", "Comedy", "Drama", "Horror", "Romance", "Science Fiction",
  "Thriller", "Animation", "Adventure", "Crime", "Fantasy", "Mystery", 
  "Documentary", "Family", "History", "Music", "War", "Western"
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
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" }
];

const SORT_OPTIONS = [
  { label: "Popularity", value: "popularity" },
  { label: "Rating", value: "rating" },
  { label: "Year", value: "year" }
];

function DiscoverContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // URL state synchronization keys
  const genreFilter = searchParams.get("genre") || "";
  const languageFilter = searchParams.get("language") || "";
  const yearFromFilter = Number(searchParams.get("year_from")) || 1902;
  const yearToFilter = Number(searchParams.get("year_to")) || 2024;
  const minRatingFilter = Number(searchParams.get("rating")) || 0;
  const sortFilter = searchParams.get("sort") || "popularity";
  const mediaTypeFilter = searchParams.get("media_type") || ""; // "movie", "tv", or ""
  const viewModeFilter = (searchParams.get("view") || "grid") as "grid" | "list";

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Unified router pushing update utility
  const updateFilter = (key: string, value: string | number | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset page on filter update
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(pathname); // Clears all queries
  };

  const fetchMovies = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (genreFilter) params.set("genres", genreFilter);
      if (languageFilter) params.set("language", languageFilter);
      params.set("year_from", String(yearFromFilter));
      params.set("year_to", String(yearToFilter));
      params.set("min_rating", String(minRatingFilter));
      params.set("sort", sortFilter);
      if (mediaTypeFilter) params.set("media_type", mediaTypeFilter);
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
            const existingIds = new Set(prev.map((m) => m.tmdb_id));
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
  }, [genreFilter, languageFilter, yearFromFilter, yearToFilter, minRatingFilter, sortFilter, mediaTypeFilter]);

  // Refetch when filters change
  useEffect(() => {
    setPage(1);
    fetchMovies(1, false);
  }, [genreFilter, languageFilter, yearFromFilter, yearToFilter, minRatingFilter, sortFilter, mediaTypeFilter, fetchMovies]);

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMovies(nextPage, true);
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [page, totalPages, loading, loadingMore, fetchMovies]);

  // Toggle helper for multi-select genre list
  const toggleGenre = (genre: string) => {
    const current = genreFilter ? genreFilter.split(",") : [];
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    updateFilter("genre", next.join(","));
  };

  const selectedGenresList = genreFilter ? genreFilter.split(",") : [];

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] pt-28 pb-20">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Header */}
        <ScrollReveal>
          <header className="mb-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[30%] h-[150%] pointer-events-none opacity-20 blur-[85px] bg-gradient-to-br from-[var(--accent-warm)] to-transparent" />
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--accent-warm)] uppercase">
                  <Compass className="h-4 w-4" /> Discover Catalog
                </div>
                <h1 className="text-3xl font-extrabold text-[var(--text-primary)] md:text-4xl font-playfair tracking-tight">
                  Global Discovery
                </h1>
                <p className="mt-2 max-w-xl text-xs text-[var(--text-secondary)] font-sans">
                  Query the high-dimensional movie catalog. Filter by genre coordinate vectors, language origins, release era, and rating threshold.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-5 py-3 text-center">
                  <div className="text-sm font-bold text-white font-mono">{totalResults.toLocaleString()}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-1">Matches</div>
                </div>
              </div>
            </div>
          </header>
        </ScrollReveal>

        {/* Control Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 text-[var(--accent-warm)]" />
              {sidebarOpen ? "Hide Filters" : "Show Filters"}
            </button>

            {/* Active Chips count */}
            {(genreFilter || languageFilter || mediaTypeFilter || minRatingFilter > 0 || yearFromFilter > 1902 || yearToFilter < 2024) && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-[var(--accent-rose)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl bg-[var(--surface-elevated)] p-1 border border-[var(--border-default)]">
              <button
                onClick={() => updateFilter("view", "grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewModeFilter === "grid" ? "bg-[var(--surface-hover)] text-[var(--accent-warm)]" : "text-[var(--text-tertiary)] hover:text-white"
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => updateFilter("view", "list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewModeFilter === "list" ? "bg-[var(--surface-hover)] text-[var(--accent-warm)]" : "text-[var(--text-tertiary)] hover:text-white"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Collapsible Sidebar */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="col-span-12 lg:col-span-3 space-y-6 lg:sticky lg:top-24 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar bg-[var(--surface-elevated)]/20 p-5 rounded-2xl border border-[var(--border-subtle)]"
              >
                {/* Media Type */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Media Type</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "All", value: "" },
                      { label: "Movies", value: "movie" },
                      { label: "TV", value: "tv" }
                    ].map((t) => (
                      <button
                        key={t.label}
                        onClick={() => updateFilter("media_type", t.value)}
                        className={`py-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer text-center uppercase tracking-wider ${
                          mediaTypeFilter === t.value
                            ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white"
                            : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre Selector */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Genres</h3>
                  <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {GENRES.map((g) => {
                      const active = selectedGenresList.includes(g);
                      return (
                        <button
                          key={g}
                          onClick={() => toggleGenre(g)}
                          className={`px-2.5 py-1 text-[10px] rounded-lg border font-medium uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            active
                              ? "bg-[var(--accent-warm)] text-black border-[var(--accent-warm)] font-bold"
                              : "bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-white/20"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Languages Flags */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Original Language</h3>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    <button
                      onClick={() => updateFilter("language", "")}
                      className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer text-left ${
                        !languageFilter
                          ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white"
                          : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                      }`}
                    >
                      🌐 All Languages
                    </button>
                    {LANGUAGES.map((l) => {
                      const active = languageFilter === l.code;
                      return (
                        <button
                          key={l.code}
                          onClick={() => updateFilter("language", l.code)}
                          className={`px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer text-left truncate ${
                            active
                              ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white"
                              : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                          }`}
                        >
                          {l.flag} {l.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Year Range */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    <span>Year Range</span>
                    <span className="font-mono text-white">{yearFromFilter} - {yearToFilter}</span>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min="1902"
                      max="2024"
                      value={yearFromFilter}
                      onChange={(e) => updateFilter("year_from", Math.min(Number(e.target.value), yearToFilter))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-warm)]"
                    />
                    <input
                      type="range"
                      min="1902"
                      max="2024"
                      value={yearToFilter}
                      onChange={(e) => updateFilter("year_to", Math.max(Number(e.target.value), yearFromFilter))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-rose)]"
                    />
                  </div>
                </div>

                {/* Rating Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    <span>Minimum Rating</span>
                    <span className="font-mono text-[var(--accent-warm)] flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current" /> {minRatingFilter.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={minRatingFilter}
                    onChange={(e) => updateFilter("rating", Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-warm)]"
                  />
                </div>

                {/* Sorting */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Sort Sequence</h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilter("sort", opt.value)}
                        className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer uppercase tracking-wider ${
                          sortFilter === opt.value
                            ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-white"
                            : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/30 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Results Area */}
          <section className={`col-span-12 ${sidebarOpen ? "lg:col-span-9" : "w-full"}`}>
            {/* Active Chips strip */}
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedGenresList.map((g) => (
                <span key={g} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white">
                  {g}
                  <button onClick={() => toggleGenre(g)} className="cursor-pointer hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {languageFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white">
                  Lang: {languageFilter.toUpperCase()}
                  <button onClick={() => updateFilter("language", "")} className="cursor-pointer hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {mediaTypeFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white">
                  Format: {mediaTypeFilter === "movie" ? "Movies" : "TV Shows"}
                  <button onClick={() => updateFilter("media_type", "")} className="cursor-pointer hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {minRatingFilter > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-white">
                  Rating: &gt; {minRatingFilter}
                  <button onClick={() => updateFilter("rating", 0)} className="cursor-pointer hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>

            {loading && movies.length === 0 ? (
              // Loading skeletons (20 cards)
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="skeleton aspect-[2/3] rounded-2xl" />
                    <div className="skeleton h-3.5 w-4/5 rounded-lg" />
                    <div className="skeleton h-3 w-3/5 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : movies.length > 0 ? (
              viewModeFilter === "grid" ? (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                  {movies.map((movie) => (
                    <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {movies.map((movie) => (
                    <div
                      key={movie.tmdb_id || movie._id}
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
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 py-24 text-center backdrop-blur-sm">
                <Film className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)] opacity-60 animate-pulse" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] font-sans">No Movies Match Search Coordinates</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm mx-auto font-sans">
                  No titles match your selected filters. Adjust your year ranges, rating values, or genres.
                </p>
              </div>
            )}

            {/* Sentinel for Infinite Scroll */}
            <div ref={sentinelRef} className="h-10 mt-12 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-[var(--accent-warm)]" />
                  <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider font-mono">
                    Querying next catalog offset...
                  </span>
                </div>
              )}
            </div>
          </section>
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
