"use client";

import Image from "next/image";
import Link from "next/link";
import { BarChart3, Heart, Play, Plus, Star } from "lucide-react";
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

  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
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
        className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow duration-500 group-hover:shadow-2xl group-hover:shadow-accent/10"
      >
        {movie.poster_url && !imgError ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-[0.4]"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-bg-elevated to-bg-surface px-3 text-center text-text-muted">
            <BarChart3 className="h-8 w-8 opacity-40" />
            <span className="line-clamp-2 text-xs font-semibold">{movie.title}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 z-20 flex flex-col gap-2" style={{ transform: "translateZ(30px)" }}>
          <div className="premium-glass rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-text-primary shadow-sm">
            {movie.cinema_region || movie.language || "film"}
          </div>
        </div>

        {movie.rating != null && movie.rating > 0 && (
          <div 
            className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-lg bg-imdb-gold px-2 py-1 text-xs font-black text-black shadow-lg"
            style={{ transform: "translateZ(35px)" }}
          >
            <Star className="h-3 w-3 fill-current" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Hover Actions */}
        <div className={`absolute inset-0 z-30 flex items-center justify-center transition-all duration-500 ${
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          <div className="flex gap-4" style={{ transform: "translateZ(50px)" }}>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/20 transition-all hover:bg-white/20 hover:scale-110">
              <Plus className="h-5 w-5" />
            </button>
            <button className="flex h-14 w-14 items-center justify-center rounded-2xl premium-gradient text-white shadow-glow transition-all hover:scale-115">
              <Play className="ml-1 h-6 w-6 fill-current" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/20 transition-all hover:bg-white/20 hover:scale-110">
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Language Badge (Bottom) */}
        {langName && movie.language !== "en" && (
          <div 
            className="absolute bottom-3 left-3 z-20 premium-glass rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-text-primary shadow-sm"
            style={{ transform: "translateZ(25px)" }}
          >
            {langName}
          </div>
        )}
      </motion.div>

      {/* Info section below */}
      <div className="mt-4 px-1">
        <h3 className="truncate text-sm font-black tracking-tight text-text-primary transition-colors group-hover:text-accent">
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
          {movie.year && <span>{movie.year}</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-text-muted/30" />
              <span className="truncate">{movie.genres[0]}</span>
            </>
          )}
        </div>
        
        {score != null && score > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-bg-elevated overflow-hidden border border-border/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${scoreWidth}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full premium-gradient"
              />
            </div>
            <span className="text-[10px] font-black text-accent">{Number(score).toFixed(2)} Match</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default MovieCard;
