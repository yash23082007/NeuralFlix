"use client";

import { useState } from "react";
import { Play, Sparkles, Star, Film, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Movie {
  tmdb_id?: number;
  title: string;
  backdrop_url?: string | null;
  poster_url?: string | null;
  year?: number | null;
  rating?: number;
  genres?: string[];
  director?: string;
  trailer_key?: string;
}

export default function Hero({ featuredMovie, sideMovies, catalogSize }: { featuredMovie: Movie; sideMovies: Movie[]; catalogSize: string | number }) {
  const [trailerOpen, setTrailerOpen] = useState(false);

  const title = featuredMovie?.title || "Discover Global Cinema";
  const year = featuredMovie?.year || 2024;
  const rating = featuredMovie?.rating || 9.1;
  const genres = featuredMovie?.genres || ["Sci-Fi", "Drama"];
  const director = featuredMovie?.director || "NeuralFlix";
  const backdrop = featuredMovie?.backdrop_url || featuredMovie?.poster_url || "";
  const trailerKey = featuredMovie?.trailer_key;
  const overview = featuredMovie?.overview || "Explore world cinema with ML-powered recommendations. From Indian masterpieces to Nordic noir, find your next favorite film.";

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[var(--surface-primary)]">
      {/* Background with 50% opacity */}
      <div className="absolute inset-0 z-0">
        {backdrop ? (
          <img
            className="w-full h-full object-cover opacity-50 filter brightness-[0.7] scale-105"
            alt="Hero Background"
            src={backdrop}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--surface-overlay)] via-[var(--surface-primary)] to-[var(--surface-primary)]" />
        )}
        {/* Animated vignette gradient bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-primary)]/90 via-transparent to-transparent" />
        {/* Secondary color wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
      </div>

      <div className="relative z-10 px-5 sm:px-8 md:px-12 w-full max-w-7xl mx-auto pb-16 pt-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Content */}
        <div className="lg:col-span-7 max-w-2xl space-y-6 md:space-y-8 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="h-[1px] w-10 bg-[var(--accent-warm)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-warm)] animate-text-glow flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> ML-Powered Cinema Discovery
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.05] font-playfair">
            Discover Films <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)]">
              Worth Watching
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg font-sans line-clamp-3">
            {overview}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="/discover"
              className="group bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] text-black font-bold px-7 py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-glow flex items-center gap-2 cursor-pointer uppercase tracking-wider text-xs font-sans"
            >
              Explore Catalog
            </a>
            {trailerKey && (
              <button
                onClick={() => setTrailerOpen(true)}
                className="group bg-[var(--surface-elevated)]/50 border border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] text-[var(--text-primary)] font-semibold px-7 py-3.5 rounded-xl active:scale-[0.98] transition-all backdrop-blur-md flex items-center gap-2 cursor-pointer uppercase tracking-wider text-xs font-sans"
              >
                <Play className="h-4 w-4 text-[var(--accent-warm)] fill-current" />
                Watch Trailer
              </button>
            )}
          </div>

          {/* Stats Strip */}
          <div className="pt-6 border-t border-[var(--border-subtle)] max-w-xl">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[var(--surface-elevated)]/40 border border-[var(--border-subtle)] p-4 rounded-2xl backdrop-blur-md">
              <div className="text-center sm:border-r border-[var(--border-subtle)] last:border-none">
                <p className="text-lg font-bold text-white font-mono">930K+</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold mt-1">Films</p>
              </div>
              <div className="text-center sm:border-r border-[var(--border-subtle)] last:border-none">
                <p className="text-lg font-bold text-white font-mono">120+</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold mt-1">Languages</p>
              </div>
              <div className="text-center sm:border-r border-[var(--border-subtle)] last:border-none">
                <p className="text-lg font-bold text-white font-mono">150+</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold mt-1">Regions</p>
              </div>
              <div className="text-center last:border-none">
                <p className="text-lg font-bold text-white font-mono">12</p>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold mt-1">ML Models</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Collage (Floating Thumbnails) */}
        <div className="lg:col-span-5 hidden lg:flex justify-center items-center relative h-[480px]">
          <img src="/hero_art.png" alt="Cinema Art" className="max-w-[400px] w-full h-auto drop-shadow-2xl opacity-90 hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>

      {/* Lazy Trailer Modal */}
      <AnimatePresence>
        {trailerOpen && trailerKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={() => setTrailerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setTrailerOpen(false)}
                className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&color=white`}
                title={`${title} — Official Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
