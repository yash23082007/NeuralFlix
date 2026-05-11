"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Star, Sparkles } from "lucide-react";
import { Movie } from "../lib/api";

const PremiumCinemaScene = dynamic(() => import("./PremiumCinemaScene"), {
  ssr: false,
  loading: () => null,
});

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
    const t = setInterval(next, 6500);
    return () => clearInterval(t);
  }, [next, items.length]);

  if (!items.length) return null;

  const movie = items[current];

  return (
    <section className="relative min-h-[86vh] overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0">
        <Image
          src={movie.backdrop_url || movie.poster_url || ""}
          alt={movie.title}
          fill
          className="object-cover object-center opacity-80 saturate-[1.08] transition-transform duration-[8s] ease-out"
          priority
        />
        <div className="hero-light-veil absolute inset-0" />
        <div className="film-grain absolute inset-0 opacity-50" />
      </div>

      <PremiumCinemaScene />

      <div className="relative z-10 mx-auto flex min-h-[86vh] max-w-7xl items-end px-4 pb-16 pt-28 md:px-8 lg:pb-20">
        <div className="w-full max-w-3xl space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/75 px-4 py-1.5 text-xs font-semibold uppercase text-text-secondary shadow-card backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI powered recommendations
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {movie.rating != null && movie.rating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-imdb-gold px-2 py-1 text-xs font-bold text-black">
                <Star className="h-3.5 w-3.5 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.year && <span className="font-semibold text-text-secondary">{movie.year}</span>}
            {movie.genres?.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-semibold text-text-secondary backdrop-blur-sm">
                {g}
              </span>
            ))}
          </div>

          <h1 className="text-5xl font-bold leading-tight text-text-primary md:text-7xl lg:text-8xl">
            {movie.title}
          </h1>

          {movie.overview && (
            <p className="line-clamp-3 max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
              {movie.overview}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={`/movie/${movie.tmdb_id || movie._id}?type=${movie.media_type || "movie"}`}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-all hover:brightness-95 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-white transition-transform group-hover:scale-110" />
              View Details
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/75 px-6 py-3.5 text-sm font-semibold text-text-primary shadow-card backdrop-blur-md transition-all hover:bg-white"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-xl border border-border bg-white/80 p-3 text-text-primary shadow-card backdrop-blur-md transition-all hover:bg-white hover:scale-105 md:left-8"
        aria-label="Previous"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-xl border border-border bg-white/80 p-3 text-text-primary shadow-card backdrop-blur-md transition-all hover:bg-white hover:scale-105 md:right-8"
        aria-label="Next"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
        {items.map((item, index) => (
          <button
            key={item.tmdb_id || item._id || index}
            onClick={() => setCurrent(index)}
            className={`rounded-full transition-all duration-300 ${
              index === current
                ? "w-10 h-1.5 bg-accent shadow-glow"
                : "w-2 h-1.5 bg-slate-400/50 hover:bg-slate-500"
            }`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
