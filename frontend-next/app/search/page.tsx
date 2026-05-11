"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MovieCard from "../../components/MovieCard";
import { BarChart3, Search, Sparkles } from "lucide-react";

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

  const label = query ? `"${query}"` : mood ? mood.replace(/_/g, " ") : "Search";

  return (
    <main className="min-h-screen bg-background pt-28 page-enter">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="premium-card mb-8 rounded-2xl p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">Search</p>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight text-text-primary">
            <Search className="h-6 w-6 text-accent" />
            {label}
          </h1>
          {searched && !loading && (
            <p className="mt-2 text-sm text-text-muted">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          )}
        </section>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-sm text-text-muted">Searching catalog...</p>
            </div>
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
          <div className="rounded-2xl border border-border bg-surface py-24 text-center">
            <BarChart3 className="mx-auto mb-4 h-10 w-10 text-text-muted" />
            <p className="text-lg font-bold text-text-primary">No matching results</p>
            <p className="mt-2 text-sm text-text-muted">Try a different title, genre, or mood.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background pt-28 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
