"use client";

import { useEffect, useState } from "react";
import { BarChart3, Film, Globe2, SlidersHorizontal, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard, { Movie } from "../../components/MovieCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GENRES = [
  "Action", "Comedy", "Drama", "Horror", "Romance", "Science Fiction",
  "Thriller", "Animation", "Adventure", "Crime", "Fantasy", "Mystery", "Documentary",
];

const REGIONS = [
  { value: "indian", label: "Indian Cinema" }, { value: "bollywood", label: "Bollywood" },
  { value: "tollywood", label: "Tollywood" }, { value: "korean", label: "Korean" },
  { value: "japanese", label: "Japanese" }, { value: "french", label: "French" },
  { value: "spanish", label: "Spanish" }, { value: "hollywood", label: "Hollywood" },
  { value: "iranian", label: "Iranian" },
];

const SORT_OPTIONS = [
  { label: "Popularity", value: "popularity" },
  { label: "Rating", value: "rating" },
  { label: "Newest", value: "newest" },
];

export default function DiscoverPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState({ region: "", genre: "", sort: "popularity" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/api/movies/?page=${page}&limit=40`;
        if (filters.region) url = `${API_BASE}/api/movies/region/${filters.region}?page=${page}`;
        if (filters.genre) url = `${API_BASE}/api/movies/genre/${filters.genre.toLowerCase()}?page=${page}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          let nextMovies = data.results || [];
          if (filters.sort === "rating") nextMovies = [...nextMovies].sort((a: Movie, b: Movie) => (b.rating || 0) - (a.rating || 0));
          if (filters.sort === "newest") nextMovies = [...nextMovies].sort((a: Movie, b: Movie) => (b.year || 0) - (a.year || 0));
          setMovies(nextMovies);
        }
      } catch (error) {
        console.error("Discover fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, [filters, page]);

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-background pt-28 page-enter">
      <div className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        {/* Header */}
        <section className="premium-card mb-8 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">Explore</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
                Discover Cinema
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                Browse by genre, region, and ranking signal across the global recommendation catalog.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Results", value: movies.length },
                { label: "Regions", value: REGIONS.length },
                { label: "Genres", value: GENRES.length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-bg-elevated px-4 py-3">
                  <div className="text-lg font-bold text-text-primary">{s.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:text-text-primary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>

        {filtersOpen && (
          <section className="premium-card mb-8 space-y-6 rounded-2xl p-6 animate-slide-down">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
                <Globe2 className="h-4 w-4" />
                Region
              </h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateFilter("region", "")}
                  className={`genre-pill ${!filters.region ? "!border-accent !bg-accent !text-white" : ""}`}>All regions</button>
                {REGIONS.map((r) => (
                  <button key={r.value} onClick={() => updateFilter("region", r.value)}
                    className={`genre-pill ${filters.region === r.value ? "!border-accent !bg-accent !text-white" : ""}`}>{r.label}</button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
                <Film className="h-4 w-4" />
                Genre
              </h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateFilter("genre", "")}
                  className={`genre-pill ${!filters.genre ? "!border-accent !bg-accent !text-white" : ""}`}>All genres</button>
                {GENRES.map((g) => (
                  <button key={g} onClick={() => updateFilter("genre", g)}
                    className={`genre-pill ${filters.genre === g ? "!border-accent !bg-accent !text-white" : ""}`}>{g}</button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-text-muted">
            {loading ? "Loading..." : `${movies.length} results`}
          </p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => updateFilter("sort", opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  filters.sort === opt.value
                    ? "bg-accent text-white shadow-sm"
                    : "border border-border bg-surface text-text-muted hover:text-text-primary"
                }`}>
                <BarChart3 className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 w-3/4 rounded-lg" />
                <div className="skeleton h-3 w-1/2 rounded-lg" />
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie) => (
              <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface py-24 text-center">
            <Film className="mx-auto mb-4 h-10 w-10 text-text-muted" />
            <h3 className="text-xl font-bold text-text-primary">No results found</h3>
            <p className="mt-2 text-sm text-text-muted">Try adjusting your filters.</p>
          </div>
        )}

        {movies.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:text-text-primary disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm">Page {page}</span>
            <button onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:text-text-primary">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
