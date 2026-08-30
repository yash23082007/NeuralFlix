"use client";

import Image from "next/image";
import Link from "next/link";
import { Film as MovieIcon, Play, Plus, Star, Check, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Movie } from "../lib/api";
import { authFetch } from "../lib/auth";
import WhyRecommendedSheet from "./recommendation/WhyRecommendedSheet";
import WhyNotThisDialog from "./recommendation/WhyNotThisDialog";

export type { Movie } from "../lib/api";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada",
  bn: "Bengali", ko: "Korean", ja: "Japanese", zh: "Chinese", fr: "French",
  it: "Italian", es: "Spanish", de: "German", pt: "Portuguese", fa: "Persian",
  ar: "Arabic", tr: "Turkish", th: "Thai", id: "Indonesian", ru: "Russian", sv: "Swedish",
};

function getMovieHref(movie: Movie) {
  return `/movie/${movie.tmdb_id || movie.id || movie._id}?type=${movie.media_type || "movie"}`;
}

export function MovieCard({
  movie,
  priority = false,
  onDismiss,
}: {
  movie: Movie;
  priority?: boolean;
  onDismiss?: (movieId: number) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [whyNotOpen, setWhyNotOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const langName = LANGUAGE_NAMES[movie.language || "en"] || movie.language?.toUpperCase();
  const score = movie.rec_score || (movie.popularity_score ? movie.popularity_score / 100.0 : 0.85);
  const scoreWidth = score != null && score <= 1 ? score * 100 : Math.min((score || 0) * 5, 100);
  const movieId = Number(movie.id || movie.tmdb_id || 0);

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const addToWatchlist = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!movieId || saving || saved) return;
    setSaving(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await authFetch(`${apiBase}/api/v1/users/me/watchlist?movie_id=${movieId}`, { method: "POST" });
      if (response.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const openWhySheet = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setWhyOpen(true);
  };

  const openWhyNotDialog = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setWhyNotOpen(true);
  };

  const handleDismiss = (mId: number) => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss(mId);
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <>
      <Link href={getMovieHref(movie)} className="group block perspective-1000">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-poster transition-all duration-500 group-hover:shadow-xl group-hover:border-[var(--border-default)]"
        >
          {/* Shimmer until loaded */}
          {!imgLoaded && movie.poster_url && movie.poster_url !== "null" && movie.poster_url !== "undefined" && !imgError && (
            <div className="absolute inset-0 skeleton" />
          )}

          {movie.poster_url && movie.poster_url !== "null" && movie.poster_url !== "undefined" && !imgError ? (
            <Image
              src={movie.poster_url}
              alt={`${movie.title || "Untitled"} (${movie.year || "N/A"}) - Rating: ${movie.rating ? movie.rating.toFixed(1) : "N/A"}`}
              fill
              priority={priority}
              className={`object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-[0.25] ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px"
              onError={() => setImgError(true)}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--surface-muted)] to-[var(--surface-elevated)] px-3 text-center text-[var(--text-tertiary)]">
              <MovieIcon className="h-8 w-8 opacity-30" />
              <span className="line-clamp-2 text-xs font-medium">{movie.title || "Untitled"}</span>
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-500 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`} />

          {/* Rating Badge */}
          {movie.rating != null && movie.rating > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-lg bg-[var(--rating-gold)] px-2 py-0.5 text-xs font-bold text-black shadow-md"
            >
              <Star className="h-3 w-3 fill-current" />
              {movie.rating.toFixed(1)}
            </motion.div>
          )}

          {/* Language Badge */}
          {langName && movie.language !== "en" && (
            <div className="absolute left-2.5 top-2.5 z-20 rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 border border-white/10">
              {langName}
            </div>
          )}

          {/* Hover Actions */}
          <div
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 transition-all duration-400 ${
              isHovered
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex items-center gap-2.5" style={{ transform: "translateZ(40px)" }}>
              {/* Watchlist */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                aria-label={saved ? "Saved to Watchlist" : "Add to Watchlist"}
                onClick={addToWatchlist}
                disabled={saving || saved}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-md border border-white/20 transition-all hover:bg-white/30 disabled:opacity-70"
                title="Add to Watchlist"
              >
                {saved ? <Check className="h-4 w-4 text-emerald-300" /> : <Plus className="h-4 w-4" />}
              </motion.button>

              {/* Play / Inspect */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                aria-label="View Details"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-warm)] text-black shadow-glow transition-all"
                title="View Movie"
              >
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </motion.button>

              {/* Why Recommended */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Why Recommended?"
                onClick={openWhySheet}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 backdrop-blur-md border border-amber-400/30 transition-all hover:bg-amber-400/30"
                title="Why is this recommended?"
              >
                <Sparkles className="h-4 w-4" />
              </motion.button>

              {/* Why Not This / Dismiss */}
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Not for me"
                onClick={openWhyNotDialog}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 backdrop-blur-md border border-white/15 transition-all hover:bg-red-500/20 hover:text-red-300"
                title="Not interested / Tune tastes"
              >
                <XCircle className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Quick metadata line */}
            <p className="text-xs text-white/80 font-medium max-w-[85%] text-center truncate px-2">
              {movie.genres?.[0] && `${movie.genres[0]} · `}{movie.year || ""}
            </p>
          </div>
        </motion.div>

        {/* Card Info Below Poster */}
        <div className="mt-3 px-0.5">
          <h3 className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-warm)]">
            {movie.title || "Untitled"}
          </h3>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
            <div className="flex items-center gap-1.5 truncate">
              {movie.year && <span>{movie.year}</span>}
              {movie.genres && movie.genres.length > 0 && (
                <>
                  <span className="h-0.5 w-0.5 rounded-full bg-[var(--text-disabled)]" />
                  <span className="truncate">{movie.genres[0]}</span>
                </>
              )}
            </div>
            {/* Why clickable affordance */}
            <button
              onClick={openWhySheet}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-warm)] hover:underline opacity-80 group-hover:opacity-100"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Why?
            </button>
          </div>

          {score != null && score > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${scoreWidth}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)]"
                />
              </div>
              <span className="text-[10px] font-semibold text-[var(--accent-warm)]">
                {Number(score).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Structured XAI Attributions Sheet */}
      <WhyRecommendedSheet
        movieId={movieId}
        isOpen={whyOpen}
        onClose={() => setWhyOpen(false)}
      />

      {/* Why Not This Feedback Dialog */}
      <WhyNotThisDialog
        movieId={movieId}
        isOpen={whyNotOpen}
        onClose={() => setWhyNotOpen(false)}
        onDismiss={handleDismiss}
      />
    </>
  );
}

export default MovieCard;
