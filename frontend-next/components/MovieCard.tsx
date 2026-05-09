"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Plus, Play, Heart } from "lucide-react";
import { useState } from "react";

import { Movie } from "../lib/api";

// ─── Language → Flag Map (Global Cinema) ────────────────────
const LANGUAGE_FLAGS: Record<string, string> = {
  // Indian Languages
  hi: "🇮🇳", ta: "🇮🇳", te: "🇮🇳", ml: "🇮🇳", kn: "🇮🇳",
  bn: "🇮🇳", pa: "🇮🇳", mr: "🇮🇳", gu: "🇮🇳", or: "🇮🇳",
  as: "🇮🇳", ur: "🇮🇳",
  // East Asian
  ko: "🇰🇷", ja: "🇯🇵", zh: "🇨🇳", yue: "🇭🇰",
  // European
  fr: "🇫🇷", it: "🇮🇹", es: "🇪🇸", de: "🇩🇪", pt: "🇧🇷",
  nl: "🇳🇱", pl: "🇵🇱", ro: "🇷🇴", cs: "🇨🇿", el: "🇬🇷",
  hu: "🇭🇺", da: "🇩🇰", sv: "🇸🇪", no: "🇳🇴", fi: "🇫🇮",
  // Middle East & Central Asia
  fa: "🇮🇷", ar: "🇪🇬", tr: "🇹🇷", he: "🇮🇱",
  // Southeast Asian
  th: "🇹🇭", id: "🇮🇩", vi: "🇻🇳", tl: "🇵🇭", ms: "🇲🇾",
  // Other
  ru: "🇷🇺", uk: "🇺🇦", en: "🇺🇸", af: "🇿🇦",
};

// ─── Language → Display Name ─────────────────────────────────
const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada",
  bn: "Bengali", pa: "Punjabi", mr: "Marathi", gu: "Gujarati",
  ko: "Korean", ja: "Japanese", zh: "Chinese", fr: "French",
  it: "Italian", es: "Spanish", de: "German", pt: "Portuguese",
  fa: "Persian", ar: "Arabic", tr: "Turkish", th: "Thai",
  id: "Indonesian", ru: "Russian", en: "English", sv: "Swedish",
};

export function MovieCard({ movie }: { movie: Movie }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const movieId = movie.tmdb_id || movie._id;
  const flag = LANGUAGE_FLAGS[movie.language || "en"] || "🌍";
  const langName = LANGUAGE_NAMES[movie.language || "en"] || movie.language?.toUpperCase();

  return (
    <Link
      href={`/movie/${movieId}?type=${movie.media_type || "movie"}`}
      className="group relative flex-shrink-0 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      id={`movie-card-${movieId}`}
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface border border-border shadow-card transition-all duration-300 group-hover:scale-[1.07] group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:border-accent/40">
        {movie.poster_url && !imgError ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover transition-all duration-500 group-hover:brightness-75"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-elevated text-text-muted gap-2">
            <span className="text-4xl opacity-50">🎬</span>
            <span className="text-xs text-center px-2 line-clamp-2">{movie.title}</span>
          </div>
        )}

        {/* Country Flag Badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className="country-flag text-lg drop-shadow-lg">{flag}</span>
        </div>

        {/* Rating Badge */}
        {movie.rating != null && movie.rating > 0 && (
          <div className="absolute top-2 right-2 z-10 imdb-rating">
            <Star className="w-3 h-3 fill-current" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Language Badge */}
        {movie.language && movie.language !== "en" && (
          <div className="absolute bottom-2 left-2 z-10 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {langName}
          </div>
        )}

        {/* Hover Overlay with Actions - Liquid Glass */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 ${isHovered ? "opacity-100" : "opacity-0"} flex flex-col justify-end p-4`}>
          <div className="flex justify-center gap-3 w-full translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110"
              title="Add to Watchlist"
              onClick={(e) => e.preventDefault()}
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-accent hover:bg-accent/90 text-black shadow-gold transition-all hover:scale-110"
              title="Play Trailer"
              onClick={(e) => e.preventDefault()}
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110"
              title="Like"
              onClick={(e) => e.preventDefault()}
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Below Card */}
      <div className="mt-2 space-y-0.5 px-0.5">
        <p className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors font-heading">
          {movie.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {movie.year && <span>{movie.year}</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="opacity-30">•</span>
              <span className="truncate">{movie.genres.slice(0, 2).join(", ")}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

export default MovieCard;
