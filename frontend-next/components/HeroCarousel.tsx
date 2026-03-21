"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight, Play } from "lucide-react";

interface Movie {
  tmdb_id: number;
  title: string;
  overview: string;
  rating: number;
  year: number;
  genres: string[];
  backdrop_url: string;
  poster_url: string;
  media_type?: string;
}

export default function HeroCarousel({ movies }: { movies: Movie[] }) {
  const [current, setCurrent] = useState(0);
  const items = movies.slice(0, 6);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prev = () => {
    setCurrent((p) => (p - 1 + items.length) % items.length);
  };

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, items.length]);

  if (items.length === 0) return null;

  const movie = items[current];

  return (
    <section className="relative w-full h-[50vh] md:h-[65vh] overflow-hidden bg-black">
      {/* Backdrop Image */}
      <div className="absolute inset-0">
        <Image
          src={movie.backdrop_url || movie.poster_url}
          alt={movie.title}
          fill
          className="object-cover object-top"
          priority
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex items-end pb-12 md:pb-16">
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="imdb-rating">
              <Star className="w-3.5 h-3.5 fill-current" />
              {movie.rating?.toFixed(1)}
            </span>
            {movie.year && (
              <span className="text-text-secondary font-medium">{movie.year}</span>
            )}
            {movie.genres?.slice(0, 3).map((g) => (
              <span key={g} className="text-text-muted text-xs hidden sm:inline">
                {g}
              </span>
            ))}
          </div>

          <h2 className="text-3xl md:text-5xl font-bold leading-tight text-white">
            {movie.title}
          </h2>

          <p className="text-text-secondary text-sm md:text-base line-clamp-3 leading-relaxed">
            {movie.overview}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/movie/${movie.tmdb_id}?type=${movie.media_type || 'movie'}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-imdb-gold text-black font-bold text-sm rounded-lg hover:bg-imdb-gold-dark transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              More Info
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? "bg-imdb-gold w-6" : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
