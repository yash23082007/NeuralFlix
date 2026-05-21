"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";
import { Movie } from "../lib/api";

export default function HeroCarousel({ movies }: { movies: Movie[] }) {
  const [current, setCurrent] = useState(0);
  const items = movies.filter((m) => m.backdrop_url || m.poster_url).slice(0, 6);

  const next = useCallback(() => {
    if (!items.length) return;
    setCurrent((p) => (p + 1) % items.length);
  }, [items.length]);

  const prev = () => {
    if (!items.length) return;
    setCurrent((v) => (v - 1 + items.length) % items.length);
  };

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [next, items.length]);

  if (!items.length) return null;

  const movie = items[current];

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-[var(--surface-primary)]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={movie.backdrop_url || movie.poster_url || ""}
          alt={movie.title}
          fill
          className="object-cover object-center opacity-50 transition-all duration-[1.2s] ease-out"
          priority
        />
        {/* Gradient Veils */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-primary)]/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--surface-primary)]/40 to-transparent h-32" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[85vh] max-w-7xl items-end px-5 pb-20 pt-32 md:px-8 lg:pb-24">
        <div className="w-full max-w-2xl space-y-6 animate-fade-in-up">
          {/* Meta Badges */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {movie.rating != null && movie.rating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--rating-gold)] px-2.5 py-1 text-xs font-bold text-black">
                <Star className="h-3.5 w-3.5 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.year && (
              <span className="font-medium text-[var(--text-secondary)]">
                {movie.year}
              </span>
            )}
            {movie.genres?.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)]/60 px-3 py-1 text-xs font-medium text-[var(--text-secondary)] backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold leading-tight text-[var(--text-primary)] md:text-6xl lg:text-7xl tracking-tight">
            {movie.title}
          </h1>

          {/* Overview */}
          {movie.overview && (
            <p className="line-clamp-3 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
              {movie.overview}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={`/movie/${movie.tmdb_id || movie._id}?type=${movie.media_type || "movie"}`}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-[var(--accent-warm)] px-7 py-3.5 text-sm font-semibold text-black shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
              View Details
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/50 px-7 py-3.5 text-sm font-medium text-[var(--text-primary)] backdrop-blur-md transition-all hover:bg-[var(--surface-hover)]"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/70 p-3 text-[var(--text-primary)] backdrop-blur-md transition-all hover:bg-[var(--surface-hover)] hover:scale-105 md:left-8"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/70 p-3 text-[var(--text-primary)] backdrop-blur-md transition-all hover:bg-[var(--surface-hover)] hover:scale-105 md:right-8"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Indicator Dots */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2.5">
        {items.map((item, index) => (
          <button
            key={item.tmdb_id || item._id || index}
            onClick={() => setCurrent(index)}
            className={`rounded-full transition-all duration-300 ${
              index === current
                ? "w-8 h-1.5 bg-[var(--accent-warm)] shadow-glow"
                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
