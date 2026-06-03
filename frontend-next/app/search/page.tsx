"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MovieCard from "../../components/MovieCard";
import { Search, Film, Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const mood = searchParams.get("mood") || "";
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!query.trim() && !mood) return;
    async function doSearch() {
      setLoading(true);
      setSearched(true);
      try {
        const url = mood
          ? `${API}/api/v1/movies/mood/${encodeURIComponent(mood)}`
          : `${API}/api/v1/search/movies?query=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : data.results || []);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [query, mood]);

  const label = query ? `"${query}"` : mood ? mood.replace(/_/g, " ") : "Search Archives";

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden pt-28 pb-24 page-enter">
      <div className="relative z-20 mx-auto max-w-7xl px-6 sm:px-12 md:px-24 py-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/80 p-6 md:p-8 backdrop-blur-md mb-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[var(--accent-warm)] mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                  Neural Search
                </span>
              </div>
              <h1 className="flex items-center gap-3 text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                <Search className="h-6 w-6 text-[var(--accent-warm)]" />
                {label}
              </h1>
            </div>

            {searched && !loading && (
              <div className="bg-[var(--surface-muted)] border border-[var(--border-subtle)] px-4 py-2 rounded-xl flex flex-col items-end">
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Results</span>
                <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {results.length} films found
                </span>
              </div>
            )}
          </div>
        </motion.section>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-6"
            >
              <div className="relative flex items-center justify-center h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--border-default)]" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-t-[var(--accent-warm)] border-r-transparent border-b-transparent border-l-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <Sparkles className="h-5 w-5 text-[var(--accent-warm)]" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-[var(--accent-warm)]">
                  Searching catalog...
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Scanning our ML-indexed film database
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results Grid */}
        {!loading && results.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {results.map((movie: any) => (
              <motion.div
                key={movie.tmdb_id || movie._id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120 } },
                }}
              >
                <MovieCard movie={movie} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Not Found */}
        {!loading && searched && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 py-24 text-center backdrop-blur-sm"
          >
            <Film className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)] opacity-50" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              No matching films found
            </h3>
            <p className="mt-2 text-sm text-[var(--text-tertiary)] max-w-sm mx-auto leading-relaxed">
              Try a different search term or explore our catalog using the Discover page.
            </p>
          </motion.div>
        )}

        {/* Empty initial state */}
        {!loading && !searched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 py-24 text-center"
          >
            <Search className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)] opacity-30" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              Start searching
            </h3>
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">
              Use the search bar above or press ⌘K to find films.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[var(--surface-primary)] pt-28 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-warm)] border-t-transparent" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
