"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MovieCard from "../../components/MovieCard";
import { BarChart3, Search, Cpu, Compass, Sliders } from "lucide-react";

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

  // Stagger animation setups
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120 } }
  };

  return (
    <main className="min-h-screen bg-[#08080a] text-[#e5e2e3] relative overflow-hidden font-sans pt-28 pb-24 page-enter">
      {/* Immersive Film Grain Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03] bg-film-grain" />

      {/* Cybernetic HUD Blueprint Grid Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,220,229,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px"
          }}
        />
        {/* Floating holographic glows */}
        <div className="absolute top-1/4 left-1/3 h-[600px] w-[600px] rounded-full bg-radial from-[#00dce5]/6 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "14s" }} />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-radial from-[#fface8]/3 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "9s" }} />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-6 sm:px-12 md:px-24 py-8">
        {/* Holographic Bento HUD Header */}
        <motion.section 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0c0c10]/50 p-6 md:p-8 backdrop-blur-md mb-10"
        >
          {/* Neon Corner Accents */}
          <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-[#00dce5]/60 rounded-tl-lg" />
          <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-[#fface8]/60 rounded-br-lg" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#00dce5] font-black uppercase">
                <Cpu className="h-3.5 w-3.5 animate-pulse" />
                QUERY COMPILER INDEX
              </div>
              <h1 className="mt-2 flex items-center gap-3 text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-mono">
                <Search className="h-6 w-6 text-[#00dce5] drop-shadow-[0_0_10px_rgba(0,220,229,0.3)]" />
                {label}
              </h1>
            </div>

            {searched && !loading && (
              <div className="bg-[#08080a]/60 border border-white/5 px-4 py-2 rounded-2xl flex flex-col items-end">
                <span className="text-[8px] font-mono text-[#70707f] uppercase tracking-widest">MATCH COUNT</span>
                <span className="text-sm font-mono font-bold text-white mt-0.5">
                  {results.length} NODES FOUND
                </span>
              </div>
            )}
          </div>
        </motion.section>

        {/* Dynamic Scanning Loader */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-6"
            >
              <div className="relative flex items-center justify-center h-20 w-20">
                <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-t-[#00dce5] border-r-transparent border-b-transparent border-l-transparent" 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <Cpu className="h-6 w-6 text-[#00dce5] animate-pulse" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-xs font-mono font-black uppercase tracking-[0.25em] text-[#00dce5]">
                  Running Neural Scan...
                </p>
                <p className="text-[9px] font-mono text-[#70707f] uppercase tracking-wider">
                  Ingesting Catalog Index Matrices
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results Grid */}
        {!loading && results.length > 0 && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {results.map((movie: any) => (
              <motion.div key={movie.tmdb_id || movie._id} variants={itemVariants}>
                <MovieCard movie={movie} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Not Found Telemetry State */}
        {!loading && searched && results.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/5 bg-[#0c0c10]/40 py-24 text-center backdrop-blur-sm relative"
          >
            <div className="absolute top-4 left-4 text-[8px] font-mono text-[#70707f] uppercase tracking-widest">[ERR: 404]</div>
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-[#70707f] opacity-50" />
            <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
              [ NO MATCHING NODES IN ARCHIVES ]
            </h3>
            <p className="mt-2 text-xs text-[#b9caca] max-w-sm mx-auto leading-relaxed">
              Verify catalog search index. The request did not trigger any active nodes in the database.
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
      <main className="min-h-screen bg-[#08080a] pt-28 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00dce5] border-t-transparent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </main>
    }>
      <SearchContent />
    </Suspense>
  );
}
