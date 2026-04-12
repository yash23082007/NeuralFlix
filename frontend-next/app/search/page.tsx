"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MovieCard from "../../components/MovieCard";
import { Search } from "lucide-react";

const API = "http://localhost:8000";

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
        let url = `${API}/api/v2/search?`;
        if (query) url += `q=${encodeURIComponent(query)}&`;
        if (mood) url += `mood=${encodeURIComponent(mood)}`;
        
        const res = await fetch(url);
        const data = await res.json();
        // V2 search returns an array directly based on my router, not { results: [] }
        setResults(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }

    doSearch();
  }, [query, mood]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Search className="w-6 h-6 text-imdb-gold" />
          {query ? (
            <>
              Results for <span className="text-imdb-gold">&quot;{query}&quot;</span>
            </>
          ) : mood ? (
            <>
              Browsing Mood: <span className="text-imdb-gold capitalize">{mood.replace('_', ' ')}</span>
            </>
          ) : (
            "Search Movies & Shows"
          )}
        </h1>
        {searched && !loading && (
          <p className="text-text-muted text-sm mt-2">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-imdb-gold border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results Grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {results.map((movie: any) => (
            <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && searched && results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-text-secondary text-lg">No results found.</p>
          <p className="text-text-muted text-sm mt-2">
            Try searching with different keywords.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="w-8 h-8 border-2 border-imdb-gold border-t-transparent rounded-full animate-spin mx-auto mt-20" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
