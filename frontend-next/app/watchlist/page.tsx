"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, ListFilter, Trash2, ArrowLeft, RefreshCw, Sparkles, SlidersHorizontal } from "lucide-react";
import { getUser, authFetch, isAuthenticated } from "../../lib/auth";
import MovieCard from "../../components/MovieCard";

export default function WatchlistPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting
  const [mediaType, setMediaType] = useState<string>(""); // "", "movie", "tv"
  const [sortBy, setSortBy] = useState<string>("date"); // "date", "rating", "alpha"

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setUser(getUser());
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const currentUser = getUser();
      if (!currentUser) return;
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API}/api/v1/users/${currentUser.id}/watchlist?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.results || []);
      }
    } catch (err) {
      console.error("Watchlist fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API}/api/v1/users/${user.id}/watchlist/${movieId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((m) => String(m.tmdb_id) !== String(movieId)));
      }
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  // Filter logic
  let filtered = [...watchlist];
  if (mediaType) {
    filtered = filtered.filter((m) => m.media_type === mediaType);
  }

  // Sort logic
  if (sortBy === "rating") {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === "alpha") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  return (
    <main className="min-h-screen bg-black text-white pt-28 pb-20 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-radial from-[var(--accent-warm)]/10 to-transparent blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-6">
          <div className="space-y-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-4xl font-extrabold font-playfair tracking-tight text-white flex items-center gap-3">
              Watchlist <span className="text-sm font-mono font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950 px-3 py-1 rounded-full border border-zinc-900">{watchlist.length} titles</span>
            </h1>
          </div>
        </header>

        {/* Filter and sorting console */}
        {watchlist.length > 0 && (
          <section className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <ListFilter className="h-3.5 w-3.5" /> Media Type
              </span>
              <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
                <button
                  onClick={() => setMediaType("")}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    !mediaType ? "bg-[var(--accent-warm)] text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMediaType("movie")}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    mediaType === "movie" ? "bg-[var(--accent-warm)] text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Movies
                </button>
                <button
                  onClick={() => setMediaType("tv")}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    mediaType === "tv" ? "bg-[var(--accent-warm)] text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  TV Shows
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Sort By
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-semibold text-white outline-none cursor-pointer focus:border-[var(--accent-warm)] transition-colors"
              >
                <option value="date">Date Added</option>
                <option value="rating">Rating</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
          </section>
        )}

        {/* Watchlist Grid */}
        <section className="min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filtered.map((movie) => (
                <div key={movie.tmdb_id || movie._id} className="relative group">
                  <MovieCard movie={movie} />
                  <button
                    onClick={(e) => handleRemove(String(movie.tmdb_id || movie._id), e)}
                    className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-black/80 hover:bg-[var(--accent-rose)] border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100 z-30"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 border border-dashed border-zinc-900 rounded-3xl max-w-lg mx-auto">
              <Film className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Start adding films</h3>
              <p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto leading-relaxed">
                Add films to build a queue of upcoming movies and sync them with collaborative vector pools.
              </p>
              <button
                onClick={() => router.push("/discover")}
                className="mt-6 px-6 py-3 rounded-xl bg-[var(--accent-warm)] text-black text-xs font-extrabold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(232,168,73,0.15)] cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
