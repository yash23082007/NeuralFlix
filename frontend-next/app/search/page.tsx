"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MovieCard from "../../components/MovieCard";
import { BarChart3, Search } from "lucide-react";

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
          ? `${API}/api/movies/mood/${encodeURIComponent(mood)}`
          : `${API}/api/search/movies?query=${encodeURIComponent(query)}`;
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

  const label = query ? `"${query}"` : mood ? mood.replace(/_/g, " ") : "Catalog search";

  return (
    <main className="min-h-screen bg-background pt-24 page-enter">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="mb-8 rounded-lg border border-border bg-surface p-6 shadow-card">
          <p className="text-xs font-black uppercase tracking-wide text-accent">Search</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-text-primary">
            <Search className="h-7 w-7 text-accent" />
            {label}
          </h1>
          {searched && !loading && (
            <p className="mt-2 text-sm font-semibold text-text-muted">
              {results.length} result{results.length !== 1 ? "s" : ""} in the candidate set
            </p>
          )}
        </section>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((movie: any) => (
              <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="rounded-lg border border-border bg-surface py-20 text-center">
            <BarChart3 className="mx-auto mb-4 h-10 w-10 text-text-muted" />
            <p className="text-lg font-black text-text-primary">No matching candidates</p>
            <p className="mt-2 text-sm text-text-muted">Try a title, genre, region, or another ranking signal.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background pt-24">
          <div className="mx-auto mt-20 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
