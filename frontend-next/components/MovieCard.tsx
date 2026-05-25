"use client";

import Image from "next/image";
import Link from "next/link";
import { Film, Heart, Play, Plus, Star } from "lucide-react";
import { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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

  // Subtle 3D Tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <Link href={getMovieHref(movie)} className="group block perspective-1000">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-poster transition-shadow duration-500 group-hover:shadow-xl"
      >
        {movie.poster_url && !imgError ? (
          <Image
            src={movie.poster_url}
            alt={`${movie.title} (${movie.year || "N/A"}) - Rating: ${movie.rating ? movie.rating.toFixed(1) : "N/A"}`}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-[0.35]"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--surface-muted)] to-[var(--surface-elevated)] px-3 text-center text-[var(--text-tertiary)]">
            <Film className="h-8 w-8 opacity-30" />
            <span className="line-clamp-2 text-xs font-medium">{movie.title}</span>
          </div>
        )}

        {/* Rating Badge */}
        {movie.rating != null && movie.rating > 0 && (
          <div className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-md bg-[var(--rating-gold)] px-2 py-0.5 text-xs font-bold text-black shadow-sm">
            <Star className="h-3 w-3 fill-current" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Language Badge */}
        {langName && movie.language !== "en" && (
          <div className="absolute left-2.5 top-2.5 z-20 rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
            {langName}
          </div>
        )}

        {/* Hover Actions */}
        <div
          className={`absolute inset-0 z-30 flex items-center justify-center transition-all duration-400 ${
            isHovered
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex gap-3" style={{ transform: "translateZ(40px)" }}>
            <button aria-label="Add to Watchlist" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/15 transition-all hover:bg-white/20 hover:scale-110">
              <Plus className="h-4 w-4" />
            </button>
            <button aria-label="Play Trailer" className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-warm)] text-black shadow-glow transition-all hover:scale-110">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </button>
            <button aria-label="Mark as Favorite" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/15 transition-all hover:bg-white/20 hover:scale-110">
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Info */}
      <div className="mt-3 px-0.5">
        <h3 className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-warm)]">
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
          {movie.year && <span>{movie.year}</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="h-0.5 w-0.5 rounded-full bg-[var(--text-disabled)]" />
              <span className="truncate">{movie.genres[0]}</span>
            </>
          )}
        </div>

        {score != null && score > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-[var(--surface-muted)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scoreWidth}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
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
  );
}


export default MovieCard;
