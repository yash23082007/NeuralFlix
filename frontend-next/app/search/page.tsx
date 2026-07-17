"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MovieCard from "../../components/MovieCard";
import { Search, Film, Sparkles, X, Clock, ArrowRight, Filter, ChevronRight } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TRENDING_SUGGESTIONS = [
  "Nolan", "Korean Thriller", "Anime", "Sci-Fi", "Bollywood", "Oscars", "Mind Blown"
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search state
  const initialQuery = searchParams.get("q") || "";
  const [inputText, setInputText] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  
  // Filters
  const [mediaType, setMediaType] = useState<string>(""); // "", "movie", "tv"
  const [language, setLanguage] = useState<string>("");
  const [sort, setSort] = useState<string>("relevance");
  const [selectedGenreFacet, setSelectedGenreFacet] = useState<string>("");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debouncing effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputText);
    }, 300);
    return () => clearTimeout(handler);
  }, [inputText]);

  // Sync debounced query with URL search params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    router.replace(`/search?${params.toString()}`);
  }, [debouncedQuery]);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem("nf_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    async function doSearch() {
      setLoading(true);
      setSearched(true);
      try {
        // Build search URL
        const params = new URLSearchParams({
          q: debouncedQuery,
          limit: "50"
        });
        const res = await fetch(`${API}/api/v1/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          
          // Save to recent searches
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
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      const next = [query, ...filtered].slice(0, 5);
      localStorage.setItem("nf_recent_searches", JSON.stringify(next));
      return next;
    });
  };

  const removeRecentSearch = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== query);
      localStorage.setItem("nf_recent_searches", JSON.stringify(next));
      return next;
    });
  };

  // Sub-filtering and sorting of results (Client-side facet refinement)
  let filteredResults = [...results];

  if (mediaType) {
    filteredResults = filteredResults.filter((m) => m.media_type === mediaType);
  }

  if (language) {
    filteredResults = filteredResults.filter((m) => m.language === language);
  }

  if (selectedGenreFacet) {
    filteredResults = filteredResults.filter((m) => m.genres?.includes(selectedGenreFacet));
  }

  if (sort === "rating") {
    filteredResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === "year") {
    filteredResults.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  // Count active filters
  const activeFiltersCount = 
    (mediaType ? 1 : 0) + 
    (language ? 1 : 0) + 
    (selectedGenreFacet ? 1 : 0) + 
    (sort !== "relevance" ? 1 : 0);

  // Compute genre facets from raw results
  const genreFacetsMap: Record<string, number> = {};
  results.forEach((m) => {
    m.genres?.forEach((g: string) => {
      genreFacetsMap[g] = (genreFacetsMap[g] || 0) + 1;
    });
  });
  const genreFacets = Object.entries(genreFacetsMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden pt-28 pb-24 page-enter">
      <div className="relative z-20 mx-auto max-w-7xl px-5 sm:px-8 md:px-12 py-8 space-y-8">
        
        {/* Large autofocus search bar */}
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/40">
            <Search className="h-6 w-6" />
          </div>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Search films by title, overview, or keywords..."
            autoFocus
            className="w-full pl-14 pr-12 py-4.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] text-lg text-white placeholder-white/30 outline-none focus:border-[var(--accent-warm)] focus:ring-4 focus:ring-[var(--accent-warm)]/10 transition-all font-sans"
          />
          {inputText && (
            <button
              onClick={() => setInputText("")}
              className="absolute inset-y-0 right-5 flex items-center text-white/40 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Empty state suggestions */}
        {!inputText && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
            {recentSearches.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Recent Searches
                </h3>
                <div className="flex flex-col gap-1">
                  {recentSearches.map((s) => (
                    <div
                      key={s}
                      onClick={() => setInputText(s)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-semibold text-white/80">{s}</span>
                      <button onClick={(e) => removeRecentSearch(s, e)} className="text-white/40 hover:text-white cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-warm)]" /> Trending Inquiries
              </h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInputText(s)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 text-xs font-semibold text-white cursor-pointer transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {inputText && (
          <div className="space-y-6">
            {/* Filter pills row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Filters</span>
                {/* Media Type */}
                <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
                  <button onClick={() => setMediaType("")} className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${!mediaType ? "bg-[var(--accent-warm)] text-black" : "text-white/70 hover:text-white"}`}>All</button>
                  <button onClick={() => setMediaType("movie")} className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${mediaType === "movie" ? "bg-[var(--accent-warm)] text-black" : "text-white/70 hover:text-white"}`}>Movies</button>
                  <button onClick={() => setMediaType("tv")} className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${mediaType === "tv" ? "bg-[var(--accent-warm)] text-black" : "text-white/70 hover:text-white"}`}>TV</button>
                </div>

                {/* Language Select */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none cursor-pointer"
                >
                  <option value="">Any Language</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ko">Korean</option>
                  <option value="ja">Japanese</option>
                  <option value="fr">French</option>
                </select>

                {/* Sort */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 outline-none cursor-pointer"
                >
                  <option value="relevance">Relevance</option>
                  <option value="rating">Rating</option>
                  <option value="year">Release Year</option>
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setMediaType("");
                    setLanguage("");
                    setSelectedGenreFacet("");
                    setSort("relevance");
                  }}
                  className="text-xs font-bold text-[var(--accent-rose)] hover:underline cursor-pointer"
                >
                  Clear Filters ({activeFiltersCount})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Genre Facets Sidebar */}
              {results.length > 0 && (
                <aside className="col-span-12 lg:col-span-3 space-y-4 bg-[var(--surface-elevated)]/20 p-5 rounded-2xl border border-[var(--border-subtle)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5" /> Genre Facets
                  </h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedGenreFacet("")}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl font-semibold text-left cursor-pointer ${
                        !selectedGenreFacet ? "bg-[var(--accent-warm)] text-black font-bold" : "hover:bg-white/5 text-white/80"
                      }`}
                    >
                      <span>Show All</span>
                      <span className="opacity-60">{results.length}</span>
                    </button>
                    {genreFacets.map(([genre, count]) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenreFacet(selectedGenreFacet === genre ? "" : genre)}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl font-semibold text-left cursor-pointer ${
                          selectedGenreFacet === genre ? "bg-[var(--accent-warm)] text-black font-bold" : "hover:bg-white/5 text-white/80"
                        }`}
                      >
                        <span className="truncate">{genre}</span>
                        <span className="opacity-60">{count}</span>
                      </button>
                    ))}
                  </div>
                </aside>
              )}

              {/* Grid / Skeletons */}
              <div className={`col-span-12 ${results.length > 0 ? "lg:col-span-9" : "w-full"}`}>
                <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-6">
                  {loading ? "Re-aligning search space..." : `Found ${filteredResults.length} matches for "${debouncedQuery}"`}
                </h2>

                {loading ? (
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <div className="skeleton aspect-[2/3] rounded-2xl" />
                        <div className="skeleton h-3.5 w-4/5 rounded-lg" />
                        <div className="skeleton h-3 w-3/5 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : filteredResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredResults.map((movie) => (
                      <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
                    ))}
                  </div>
                ) : searched ? (
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 py-24 text-center backdrop-blur-sm">
                    <Film className="mx-auto mb-4 h-12 w-12 text-white/20 animate-pulse" />
                    <h3 className="text-lg font-bold text-white">No matches found</h3>
                    <p className="mt-2 text-sm text-[var(--text-tertiary)] max-w-sm mx-auto leading-relaxed">
                      Try different keywords, adjust filter values, or query popular categories.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 py-24 text-center backdrop-blur-sm">
                    <Search className="mx-auto mb-4 h-12 w-12 text-white/20 animate-pulse" />
                    <h3 className="text-lg font-bold text-white">Start typing to search</h3>
                    <p className="mt-2 text-sm text-[var(--text-tertiary)] max-w-sm mx-auto leading-relaxed">
                      Type at least 2 characters to browse the cinematic catalog.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
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
          <p className="text-sm text-[var(--text-tertiary)] font-mono">Loading Search Telemetry...</p>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
