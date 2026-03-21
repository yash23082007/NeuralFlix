"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

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
  return (
    <Link
      href={`/movie/${movie.tmdb_id}?type=${movie.media_type || 'movie'}`}
      className="group flex-shrink-0 w-[150px] md:w-[175px]"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-light shadow-md group-hover:shadow-xl group-hover:shadow-black/40 transition-all duration-300 group-hover:-translate-y-1">
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
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-imdb-gold transition-colors">
          {movie.title}
        </h3>
        {movie.year && (
          <p className="text-xs text-text-muted">{movie.year}</p>
        )}
      </div>
    </Link>
  );
}
