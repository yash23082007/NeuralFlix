"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, Heart, Play, Plus, Star } from "lucide-react";
import { useState } from "react";

import { Movie } from "../lib/api";

export type { Movie } from "../lib/api";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  de: "German",
  pt: "Portuguese",
  fa: "Persian",
  ar: "Arabic",
  tr: "Turkish",
  th: "Thai",
  id: "Indonesian",
  ru: "Russian",
  en: "English",
  sv: "Swedish",
};

function getMovieHref(movie: Movie) {
  const movieId = movie.tmdb_id || movie._id;
  return `/movie/${movieId}?type=${movie.media_type || "movie"}`;
}

export function MovieCard({ movie }: { movie: Movie }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const langName = LANGUAGE_NAMES[movie.language || "en"] || movie.language?.toUpperCase();
  const score = movie.rec_score || movie.popularity_score;

  return (
    <Link
      href={getMovieHref(movie)}
      className="group relative block min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-accent/50">
        {movie.poster_url && !imgError ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg-elevated px-3 text-center text-text-muted">
            <BarChart3 className="h-8 w-8 opacity-60" />
            <span className="line-clamp-2 text-xs font-bold">{movie.title}</span>
          </div>
        )}

        <div className="absolute left-2 top-2 rounded border border-white/15 bg-black/60 px-1.5 py-0.5 text-[10px] font-black uppercase text-white backdrop-blur">
          {movie.cinema_region || movie.language || "film"}
        </div>

        {movie.rating != null && movie.rating > 0 && (
          <div className="absolute right-2 top-2 imdb-rating">
            <Star className="h-3 w-3 fill-current" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {langName && movie.language !== "en" && (
          <div className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[10px] font-black uppercase text-white backdrop-blur">
            {langName}
          </div>
        )}

        <div
          className={`absolute inset-0 flex items-end bg-black/45 p-3 backdrop-blur-sm transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex w-full justify-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white backdrop-blur transition-transform hover:scale-105"
              title="Add to watchlist"
              onClick={(event) => event.preventDefault()}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-black shadow-gold transition-transform hover:scale-105"
              title="Open details"
              onClick={(event) => event.preventDefault()}
            >
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white backdrop-blur transition-transform hover:scale-105"
              title="Like"
              onClick={(event) => event.preventDefault()}
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 min-w-0 space-y-1 px-0.5">
        <p className="truncate text-sm font-extrabold text-text-primary transition-colors group-hover:text-accent">
          {movie.title}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
          {movie.year && <span>{movie.year}</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="opacity-40">/</span>
              <span className="truncate">{movie.genres.slice(0, 2).join(", ")}</span>
            </>
          )}
        </div>
        {score != null && score > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-text-muted">
            <BarChart3 className="h-3 w-3 text-accent" />
            <span>ML score {Number(score).toFixed(2)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default MovieCard;
