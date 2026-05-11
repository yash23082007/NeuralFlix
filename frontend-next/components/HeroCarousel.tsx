"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, Play, Star } from "lucide-react";

import { Movie } from "../lib/api";

export default function HeroCarousel({ movies }: { movies: Movie[] }) {
  const [current, setCurrent] = useState(0);
  const items = movies.filter((movie) => movie.backdrop_url || movie.poster_url).slice(0, 6);

  const next = useCallback(() => {
    if (items.length === 0) return;
    setCurrent((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prev = () => {
    if (items.length === 0) return;
    setCurrent((value) => (value - 1 + items.length) % items.length);
  };

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(next, 6500);
    return () => clearInterval(timer);
  }, [next, items.length]);

  if (items.length === 0) return null;

  const movie = items[current];
  const imageSrc = movie.backdrop_url || movie.poster_url || "";

  return (
    <section className="relative min-h-[620px] overflow-hidden bg-black pt-24">
      <div className="absolute inset-0">
        <Image src={imageSrc} alt={movie.title} fill className="object-cover object-top" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[520px] max-w-7xl items-end px-4 pb-14 md:px-6">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white backdrop-blur">
            <BarChart3 className="h-4 w-4 text-accent" />
            Hybrid recommendation candidate
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {movie.rating != null && movie.rating > 0 && (
              <span className="imdb-rating">
                <Star className="h-3.5 w-3.5 fill-current" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.year && <span className="font-bold text-white/80">{movie.year}</span>}
            {movie.genres?.slice(0, 3).map((genre) => (
              <span key={genre} className="rounded border border-white/15 px-2 py-1 text-xs font-bold text-white/70">
                {genre}
              </span>
            ))}
          </div>

          <h1 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-6xl">
            {movie.title}
          </h1>

          {movie.overview && (
            <p className="line-clamp-3 max-w-xl text-sm leading-7 text-white/72 md:text-base">
              {movie.overview}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={`/movie/${movie.tmdb_id || movie._id}?type=${movie.media_type || "movie"}`}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-black text-black shadow-gold transition-colors hover:bg-imdb-gold-dark"
            >
              <Play className="h-4 w-4 fill-current" />
              Inspect match
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              Browse catalog
            </Link>
          </div>
        </div>
      </div>

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 rounded-md border border-white/15 bg-black/45 p-2 text-white backdrop-blur transition-colors hover:bg-black/70"
        aria-label="Previous recommendation"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 z-20 rounded-md border border-white/15 bg-black/45 p-2 text-white backdrop-blur transition-colors hover:bg-black/70"
        aria-label="Next recommendation"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {items.map((item, index) => (
          <button
            key={item.tmdb_id || item._id || index}
            onClick={() => setCurrent(index)}
            className={`h-2 rounded-full transition-all ${
              index === current ? "w-7 bg-accent" : "w-2 bg-white/35 hover:bg-white/60"
            }`}
            aria-label={`Show recommendation ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
