"use client";

import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, Globe, Calendar, Sparkles, Film } from "lucide-react";
import { MovieCard, Movie } from "../../components/MovieCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GENRES = [
  "Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi",
  "Thriller", "Animation", "Adventure", "Crime", "Fantasy",
  "Mystery", "Documentary",
];

const REGIONS = [
  { value: "indian",   label: "🇮🇳 Indian Cinema" },
  { value: "bollywood", label: "🎬 Bollywood" },
  { value: "tollywood", label: "🌟 Tollywood" },
  { value: "kollywood", label: "🎭 Kollywood" },
  { value: "mollywood", label: "🌿 Mollywood" },
  { value: "korean",   label: "🇰🇷 Korean" },
  { value: "japanese", label: "🇯🇵 Japanese" },
  { value: "french",   label: "🇫🇷 French" },
  { value: "spanish",  label: "🇪🇸 Spanish" },
  { value: "hollywood",label: "🇺🇸 Hollywood" },
  { value: "nollywood",label: "🇳🇬 Nollywood" },
  { value: "iranian",  label: "🇮🇷 Iranian" },
  { value: "chinese",  label: "🇨🇳 Chinese" },
  { value: "thai",     label: "🇹🇭 Thai" },
  { value: "turkish",  label: "🇹🇷 Turkish" },
];

const ERAS = [
  { label: "All Time", value: "" },
  { label: "2020s", value: "2020s" },
  { label: "2010s", value: "2010s" },
  { label: "2000s", value: "2000s" },
  { label: "1990s", value: "1990s" },
  { label: "1980s", value: "1980s" },
  { label: "Classics (Pre-1980)", value: "classic" },
];

const SORT_OPTIONS = [
  { label: "Most Popular", value: "popularity" },
  { label: "Highest Rated", value: "rating" },
  { label: "Newest First", value: "newest" },
];

export default function DiscoverPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    region: "",
    genre: "",
    era: "",
    sort: "popularity",
    query: "",
  });
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, [filters, page]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      let url = "";

      // Determine the best endpoint based on active filters
      if (filters.region) {
        url = `${API_BASE}/api/movies/region/${filters.region}?page=${page}`;
      } else if (filters.genre) {
        url = `${API_BASE}/api/movies/genre/${filters.genre}?page=${page}`;
      } else {
        url = `${API_BASE}/api/movies/?page=${page}&limit=40`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMovies(data.results || []);
      }
    } catch (e) {
      console.error("Discover fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-background pt-20 page-enter">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-accent-korea/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-8 h-8 text-accent" />
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-primary">
              Discover
            </h1>
          </div>
          <p className="text-lg text-text-secondary max-w-2xl">
            Explore cinema from 50+ countries. Filter by region, genre, era, and mood to find your next favorite film.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
        {/* Filter Toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 mb-6 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {filtersOpen ? "Hide" : "Show"} Filters
        </button>

        {/* Filters */}
        {filtersOpen && (
          <div className="glass-card p-6 mb-8 space-y-6">
            {/* Cinema Region */}
            <div>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Cinema Region
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateFilter("region", "")}
                  className={`genre-pill ${!filters.region ? "!bg-accent !text-black !border-accent" : ""}`}
                >
                  All Regions
                </button>
                {REGIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => updateFilter("region", r.value)}
                    className={`genre-pill ${filters.region === r.value ? "!bg-accent !text-black !border-accent" : ""}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre */}
            <div>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Film className="w-4 h-4" /> Genre
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateFilter("genre", "")}
                  className={`genre-pill ${!filters.genre ? "!bg-accent !text-black !border-accent" : ""}`}
                >
                  All Genres
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => updateFilter("genre", g.toLowerCase())}
                    className={`genre-pill ${filters.genre === g.toLowerCase() ? "!bg-accent !text-black !border-accent" : ""}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Era */}
            <div>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Era
              </h3>
              <div className="flex flex-wrap gap-2">
                {ERAS.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => updateFilter("era", e.value)}
                    className={`genre-pill ${filters.era === e.value ? "!bg-accent !text-black !border-accent" : ""}`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-muted">
            {loading ? "Searching..." : `${movies.length} films found`}
            {filters.region && ` in ${REGIONS.find(r => r.value === filters.region)?.label || filters.region}`}
            {filters.genre && ` • ${filters.genre}`}
          </p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => updateFilter("sort", s.value)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filters.sort === s.value
                    ? "bg-accent text-black font-bold"
                    : "bg-surface text-text-muted hover:text-text-primary"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Movie Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {movies.map((m) => (
              <MovieCard key={m.tmdb_id || m._id} movie={m} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-50">🎬</div>
            <h3 className="text-xl font-semibold mb-2">No films found</h3>
            <p className="text-text-muted">Try adjusting your filters to discover more cinema.</p>
          </div>
        )}

        {/* Pagination */}
        {movies.length > 0 && (
          <div className="flex justify-center gap-3 mt-12">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 disabled:opacity-30 transition-all"
            >
              Previous
            </button>
            <span className="px-4 py-2.5 bg-accent text-black font-bold text-sm rounded-lg">
              Page {page}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              className="px-5 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
