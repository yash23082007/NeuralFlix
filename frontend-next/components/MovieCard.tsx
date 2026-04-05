"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";

interface MovieCardProps {
  movie: {
    tmdb_id: number;
    title: string;
    poster_url: string;
    rating: number;
    year: number;
    media_type?: string;
  };
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout>();

  return (
    <motion.div
      onHoverStart={() => {
        hoverTimer.current = setTimeout(() => setIsHovered(true), 500);
      }}
      onHoverEnd={() => {
        clearTimeout(hoverTimer.current);
        setIsHovered(false);
      }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      layout
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative group flex-shrink-0 w-[150px] md:w-[175px]"
    >
      <Link
        href={`/movie/${movie.tmdb_id}?type=${movie.media_type || 'movie'}`}
        className="block"
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-light shadow-md transition-all duration-300">
          <Image
            src={movie.poster_url || "/placeholder.jpg"}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="175px"
          />

          {/* Rating Badge */}
          {movie.rating > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-1.5 py-0.5 rounded">
              <Star className="w-3 h-3 text-imdb-gold fill-current" />
              {movie.rating.toFixed(1)}
            </div>
          )}

          {/* Media Type Badge */}
          {movie.media_type === "tv" && (
            <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
              Series
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>

        {/* Info */}
        <div className="mt-2 space-y-0.5">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-amber-500 transition-colors">
            {movie.title}
          </h3>
          {movie.year && (
            <p className="text-xs text-text-muted">{movie.year}</p>
          )}
        </div>
      </Link>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-xl z-50 text-xs text-white"
          >
            <div className="flex gap-2 mb-2">
              <button className="bg-white text-black px-3 py-1 rounded font-bold w-full">Play</button>
              <button className="bg-surface-light text-white px-3 py-1 rounded border border-border">+</button>
            </div>
            <p className="text-text-muted line-clamp-2">
              Loading trailer and details...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
