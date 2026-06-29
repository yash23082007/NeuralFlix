"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, RefreshCw } from "lucide-react";
import { getTrendingAll, Movie } from "../../lib/api";

export default function SwipePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      try {
        const data = await getTrendingAll();
        if (data && data.length > 0) {
          setMovies(data);
        }
      } catch (e) {
        console.error("Failed to load movies for swipe:", e);
      } finally {
        setLoading(false);
      }
    }
    loadMovies();
  }, []);

  const handleSwipe = (direction: "left" | "right") => {
    if (currentIndex >= movies.length) return;
    
    const movie = movies[currentIndex];
    
    // In a real app, we would send this interaction to the backend via WebSocket
    // to instantly update the user's ML Taste DNA embedding.
    console.log(`Swiped ${direction} on: ${movie.title}`);
    
    setCurrentIndex((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-primary)]">
        <RefreshCw className="w-8 h-8 text-[var(--accent-warm)] animate-spin" />
      </div>
    );
  }

  if (currentIndex >= movies.length || movies.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-primary)] text-[var(--text-primary)]">
        <Sparkles className="w-16 h-16 text-[var(--accent-warm)] mb-4" />
        <h2 className="text-3xl font-bold mb-2">Taste DNA Updated</h2>
        <p className="text-[var(--text-secondary)] text-center max-w-sm">You've rated all trending movies. Your recommendations are now hyper-personalized.</p>
        <button 
          onClick={() => window.location.href = "/recommendations"}
          className="mt-8 px-8 py-3 rounded-full bg-[var(--accent-warm)] text-white font-bold hover:scale-105 transition-transform"
        >
          See My Matches
        </button>
      </div>
    );
  }

  const currentMovie = movies[currentIndex];

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] overflow-hidden flex flex-col items-center justify-center relative">
      
      {/* Background Blur */}
      {currentMovie?.poster_url && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl scale-110"
          style={{ backgroundImage: `url(${currentMovie.poster_url})` }}
        />
      )}
      
      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">
        <div className="mb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[var(--accent-warm)]">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Taste DNA Engine</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">Swipe right if you'd watch it, left if not.</p>
        </div>

        <div className="relative w-full aspect-[2/3] max-h-[60vh]">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentMovie.tmdb_id || currentMovie.title}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, { offset }) => {
                const swipe = offset.x;
                if (swipe < -100) handleSwipe("left");
                else if (swipe > 100) handleSwipe("right");
              }}
              className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[var(--surface-elevated)] cursor-grab active:cursor-grabbing"
            >
              {currentMovie.poster_url ? (
                <img 
                  src={currentMovie.poster_url} 
                  alt={currentMovie.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center p-8 text-center">
                  <h3 className="text-4xl font-bold text-white">{currentMovie.title}</h3>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded bg-[var(--accent-warm)]/20 text-[var(--accent-warm)] text-xs font-bold backdrop-blur-md">
                    {currentMovie.year}
                  </span>
                  {currentMovie.rating && (
                    <span className="px-2 py-1 rounded bg-white/10 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1">
                      ⭐ {currentMovie.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2">
                  {currentMovie.title}
                </h3>
                <p className="text-white/70 text-sm line-clamp-3">
                  {currentMovie.overview}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-8 mt-12 w-full max-w-[300px]">
          <button 
            onClick={() => handleSwipe("left")}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all hover:scale-110 shadow-lg active:scale-95"
          >
            <X className="w-8 h-8" />
          </button>
          
          <button 
            onClick={() => handleSwipe("right")}
            className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--surface-elevated)] border border-[var(--accent-warm)]/20 text-[var(--accent-warm)] hover:bg-[var(--accent-warm)] hover:text-white transition-all hover:scale-110 shadow-lg active:scale-95"
          >
            <Heart className="w-7 h-7 fill-current" />
          </button>
        </div>
      </div>
    </main>
  );
}
