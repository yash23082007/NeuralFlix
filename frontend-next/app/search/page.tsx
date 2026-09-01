"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import MovieCard from "../../components/MovieCard";
import { Search, Sparkles, X, Clock, Filter, Tag } from "lucide-react";

const EXAMPLE_QUERIES = [
  "dark sci-fi under 2 hours",
  "korean thrillers from the 2010s",
  "funny movies under 100 minutes",
  "epic fantasy and science fiction",
  "thoughtful mystery dramas",
  "Christopher Nolan mind bending",
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") || "";
  const [inputText, setInputText] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [parsedIntent, setParsedIntent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputText);
    }, 250);
    return () => clearTimeout(handler);
  }, [inputText]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    }
    router.replace(`/search?${params.toString()}`);
  }, [debouncedQuery]);

  useEffect(() => {
    const saved = localStorage.getItem("neuralflix_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setParsedIntent(null);
      setSearched(false);
      return;
    }

    async function doSearch() {
      setLoading(true);
      setSearched(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setParsedIntent(data.parsed_intent || null);
          saveRecentSearch(debouncedQuery);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [debouncedQuery]);

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const searches = [query.trim(), ...recentSearches.filter((s) => s !== query.trim())].slice(0, 5);
    setRecentSearches(searches);
    localStorage.setItem("neuralflix_recent_searches", JSON.stringify(searches));
  };

  const handleExampleClick = (query: string) => {
    setInputText(query);
    setDebouncedQuery(query);
  };

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] pb-24 pt-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-8">
        {/* Search Header & Input */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--accent-warm)] font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Movie Search
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-playfair">
            Search Movies & World Cinema
          </h1>

          {/* Search Box */}
          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Try 'korean thrillers from the 2010s' or 'dark sci-fi under 2 hours'..."
              className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] py-4 pl-12 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-warm)] shadow-lg transition-all"
            />
            {inputText && (
              <button
                onClick={() => setInputText("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Example query chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-[11px] text-[var(--text-tertiary)] font-medium">Examples:</span>
            {EXAMPLE_QUERIES.map((eq, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(eq)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--accent-warm)] transition-colors"
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Parsed NLP Intent Breakdown */}
        {parsedIntent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-4 flex flex-wrap items-center gap-2 text-xs"
          >
            <span className="font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5 pr-2">
              <Filter className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
              Detected Filters:
            </span>
            {parsedIntent.genres?.length > 0 && (
              <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-[var(--accent-warm)] font-medium">
                Genres: {parsedIntent.genres.join(", ")}
              </span>
            )}
            {parsedIntent.tone && (
              <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-amber-300 font-medium">
                Tone: {parsedIntent.tone}
              </span>
            )}
            {parsedIntent.region && (
              <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-blue-300 font-medium">
                Region: {parsedIntent.region}
              </span>
            )}
            {parsedIntent.runtime_max && (
              <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-emerald-300 font-medium">
                Max Runtime: ≤{parsedIntent.runtime_max}m
              </span>
            )}
            {parsedIntent.year_min && (
              <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-purple-300 font-medium">
                Era: {parsedIntent.year_min}s
              </span>
            )}
          </motion.div>
        )}

        {/* Results Area */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-24 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-warm)] border-r-transparent mx-auto mb-3" />
              <p className="text-xs text-[var(--text-tertiary)]">Searching movie catalog...</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-default)] p-16 text-center text-xs text-[var(--text-tertiary)] max-w-lg mx-auto">
              No movies found matching your search. Try broader terms or check the suggested filters above.
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>Found {results.length} relevant titles</span>
                <span className="font-mono text-[10px]">Ranked by relevance & rating</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                {results.map((movie) => (
                  <MovieCard key={movie.tmdb_id || movie.id} movie={movie} />
                ))}
              </div>
            </div>
          ) : (
            recentSearches.length > 0 && (
              <div className="max-w-md mx-auto rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Recent Searches
                </h3>
                <div className="space-y-1.5">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(term)}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-between"
                    >
                      <span>{term}</span>
                      <Tag className="h-3 w-3 text-[var(--text-tertiary)]" />
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[var(--surface-primary)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-warm)] border-r-transparent" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
