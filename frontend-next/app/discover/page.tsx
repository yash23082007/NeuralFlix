"use client";

import { useEffect, useState } from "react";
import { BarChart3, Film, Globe2, SlidersHorizontal } from "lucide-react";
import MovieCard, { Movie } from "../../components/MovieCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Romance",
  "Science Fiction",
  "Thriller",
  "Animation",
  "Adventure",
  "Crime",
  "Fantasy",
  "Mystery",
  "Documentary",
];

const REGIONS = [
  { value: "indian", label: "Indian Cinema" },
  { value: "bollywood", label: "Bollywood" },
  { value: "tollywood", label: "Tollywood" },
  { value: "korean", label: "Korean" },
  { value: "japanese", label: "Japanese" },
  { value: "french", label: "French" },
  { value: "spanish", label: "Spanish" },
  { value: "hollywood", label: "Hollywood" },
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
  const [filters, setFilters] = useState({
    region: "",
    genre: "",
    sort: "popularity",
  });
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
          if (filters.sort === "rating") {
            nextMovies = [...nextMovies].sort((a: Movie, b: Movie) => (b.rating || 0) - (a.rating || 0));
          }
          if (filters.sort === "newest") {
            nextMovies = [...nextMovies].sort((a: Movie, b: Movie) => (b.year || 0) - (a.year || 0));
          }
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
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-background pt-24 page-enter">
      <div className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <section className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-card md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-accent">Catalog explorer</p>
              <h1 className="mt-2 text-4xl font-black text-text-primary md:text-5xl">
                Feature-rich movie search
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                Browse by genre, region, and ranking signal across the recommendation catalog.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3">
                <div className="text-lg font-black text-text-primary">{movies.length}</div>
                <div className="text-[10px] font-bold uppercase text-text-muted">Results</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3">
                <div className="text-lg font-black text-text-primary">{REGIONS.length}</div>
                <div className="text-[10px] font-bold uppercase text-text-muted">Regions</div>
              </div>
              <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3">
                <div className="text-lg font-black text-text-primary">{GENRES.length}</div>
                <div className="text-[10px] font-bold uppercase text-text-muted">Genres</div>
              </div>
            </div>
          </div>
        </section>

        <button
          onClick={() => setFiltersOpen((value) => !value)}
          className="mb-5 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>

        {filtersOpen && (
          <section className="mb-8 space-y-6 rounded-lg border border-border bg-surface p-5 shadow-card">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-text-muted">
                <Globe2 className="h-4 w-4" />
                Region
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateFilter("region", "")}
                  className={`genre-pill ${!filters.region ? "!border-accent !bg-accent !text-black" : ""}`}
                >
                  All regions
                </button>
                {REGIONS.map((region) => (
                  <button
                    key={region.value}
                    onClick={() => updateFilter("region", region.value)}
                    className={`genre-pill ${filters.region === region.value ? "!border-accent !bg-accent !text-black" : ""}`}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-text-muted">
                <Film className="h-4 w-4" />
                Genre
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateFilter("genre", "")}
                  className={`genre-pill ${!filters.genre ? "!border-accent !bg-accent !text-black" : ""}`}
                >
                  All genres
                </button>
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => updateFilter("genre", genre)}
                    className={`genre-pill ${filters.genre === genre ? "!border-accent !bg-accent !text-black" : ""}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-text-muted">
            {loading ? "Loading candidates" : `${movies.length} candidates`}
          </p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateFilter("sort", option.value)}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-black transition-colors ${
                  filters.sort === option.value
                    ? "bg-accent text-black"
                    : "border border-border bg-surface text-text-muted hover:text-text-primary"
                }`}
              >
                <BarChart3 className="h-3 w-3" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="skeleton aspect-[2/3]" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
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
          <div className="rounded-lg border border-border bg-surface py-20 text-center">
            <Film className="mx-auto mb-4 h-10 w-10 text-text-muted" />
            <h3 className="text-xl font-black text-text-primary">No candidates found</h3>
            <p className="mt-2 text-sm text-text-muted">Adjust the filters to widen the recall set.</p>
          </div>
        )}

        {movies.length > 0 && (
          <div className="mt-12 flex justify-center gap-3">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
            >
              Previous
            </button>
            <span className="rounded-md bg-accent px-4 py-2.5 text-sm font-black text-black">Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              className="rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
