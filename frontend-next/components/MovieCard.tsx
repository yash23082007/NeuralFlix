"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, Heart, Play, Plus, Star } from "lucide-react";
import { useState } from "react";
import { Movie } from "../lib/api";

export type { Movie } from "../lib/api";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada",
  bn: "Bengali", ko: "Korean", ja: "Japanese", zh: "Chinese", fr: "French",
  it: "Italian", es: "Spanish", de: "German", pt: "Portuguese", fa: "Persian",
  ar: "Arabic", tr: "Turkish", th: "Thai", id: "Indonesian", ru: "Russian", sv: "Swedish",
};

function getMovieHref(movie: Movie) {
  return `/movie/${movie.tmdb_id || movie._id}?type=${movie.media_type || "movie"}`;
}

export function MovieCard({ movie }: { movie: Movie }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const langName = LANGUAGE_NAMES[movie.language || "en"] || movie.language?.toUpperCase();
  const score = movie.rec_score || movie.popularity_score;
  const scoreWidth = score != null && score <= 1 ? score * 100 : Math.min((score || 0) * 5, 100);

  return (
    <Link
      href={getMovieHref(movie)}
      className="group relative block min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-border bg-white shadow-card transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl">
        {movie.poster_url && !imgError ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-50"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-bg-elevated to-bg-surface px-3 text-center text-text-muted">
            <BarChart3 className="h-8 w-8 opacity-40" />
            <span className="line-clamp-2 text-xs font-semibold">{movie.title}</span>
          </div>
        )}

        {/* Cinema region badge */}
        <div className="absolute left-2.5 top-2.5 rounded-lg border border-white/50 bg-white/85 px-2 py-1 text-[10px] font-bold uppercase text-text-primary shadow-sm backdrop-blur-sm">
          {movie.cinema_region || movie.language || "film"}
        </div>

        {/* Rating */}
        {movie.rating != null && movie.rating > 0 && (
          <div className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-imdb-gold px-2 py-1 text-xs font-bold text-black">
            <Star className="h-3 w-3 fill-current" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Language */}
        {langName && movie.language !== "en" && (
          <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase text-text-primary shadow-sm backdrop-blur-sm">
            {langName}
          </div>
        )}

        {/* Hover overlay */}
        <div className={`absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 transition-all duration-400 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          <div className="flex w-full justify-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20"
              title="Add to watchlist"
            >
              <Plus className="h-4 w-4" />
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-glow transition-all hover:scale-110"
              title="View details"
            >
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/20"
              title="Like"
            >
              <Heart className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Info below card */}
      <div className="mt-3 min-w-0 space-y-1.5 px-0.5">
        <p className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent">
          {movie.title}
        </p>
        <div className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
          {movie.year && <span>{movie.year}</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="opacity-30">/</span>
              <span className="truncate">{movie.genres.slice(0, 2).join(", ")}</span>
            </>
          )}
        </div>
        {score != null && score > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
            <div className="h-1 w-14 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-neural-purple"
                style={{ width: `${scoreWidth}%` }}
              />
            </div>
            <span>ML {Number(score).toFixed(2)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default MovieCard;
