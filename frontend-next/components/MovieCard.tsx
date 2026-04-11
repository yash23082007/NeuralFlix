'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { StarIcon, PlayIcon, PlusIcon, HeartIcon } from 'lucide-react';
import Link from 'next/link';

export interface Movie {
  _id?: string;
  tmdb_id?: number | string;
  title: string;
  poster_url?: string;
  poster_path?: string; // fallback
  rating?: number;
  vote_average?: number; // fallback
  year?: number;
  release_year?: string | number; // fallback
  language?: string;
  genres?: string[];
  runtime?: number;
}

interface MovieCardProps {
  movie: Movie;
  rank?: number;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  hi: '🇮🇳',
  ko: '🇰🇷',
  ja: '🇯🇵',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  de: '🇩🇪',
  te: '🌟', // Tollywood
  ta: '🎭', // Kollywood
  ml: '🌿', // Mollywood
  zh: '🇨🇳',
  ar: '🇸🇦',
  en: '🇺🇸',
};

const LANGUAGE_NAMES: Record<string, string> = {
  hi: 'Hindi', ko: 'Korean', ja: 'Japanese', fr: 'French',
  es: 'Spanish', it: 'Italian', de: 'German', te: 'Telugu',
  ta: 'Tamil', ml: 'Malayalam', zh: 'Chinese', en: 'English'
};

export function MovieCard({ movie, rank }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const posterSrc = movie.poster_url || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder-poster.jpg');
  const rating = movie.rating || movie.vote_average || 0;
  const year = movie.year || movie.release_year;
  const flag = movie.language ? LANGUAGE_FLAGS[movie.language] : '';
  const langName = movie.language ? LANGUAGE_NAMES[movie.language] || movie.language.toUpperCase() : '';

  return (
    <div className="flex flex-col gap-2 group">
      <Link href={`/movie/${movie.tmdb_id || movie._id}`} className="block">
        <motion.div
          className="relative rounded-xl overflow-hidden cursor-pointer aspect-[2/3] bg-surface"
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
        >
          {/* Rank badge */}
          {rank && rank <= 10 && (
            <div className="absolute top-2 left-2 z-10 bg-accent text-black text-xs font-bold px-2 py-1 rounded">
              #{rank}
            </div>
          )}

          {/* Poster */}
          <div className="w-full h-full relative">
            <Image
              src={posterSrc}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {/* Flag & Rating Overlay (persistent) */}
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
            {flag && <span className="text-sm">{flag}</span>}
            <div className="flex items-center gap-1 text-xs font-bold text-white">
              <StarIcon className="w-3.5 h-3.5 text-accent fill-accent" />
              <span>{rating > 0 ? rating.toFixed(1) : 'NR'}</span>
            </div>
          </div>

          {/* Hover overlay actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-center items-center gap-4 z-20"
              >
                <button className="bg-accent text-black rounded-full p-3 hover:bg-yellow-400 transition-colors transform hover:scale-110">
                  <PlayIcon className="w-6 h-6 fill-black" />
                </button>
                <div className="flex gap-3">
                  <button className="bg-surface/80 p-2 rounded-full hover:bg-white hover:text-black transition-colors backdrop-blur-sm">
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  <button className="bg-surface/80 p-2 rounded-full hover:bg-white hover:text-black transition-colors backdrop-blur-sm">
                    <HeartIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>

      {/* Title & Meta below card */}
      <div className="px-1">
        <Link href={`/movie/${movie.tmdb_id || movie._id}`}>
          <h3 className="font-display font-semibold text-text-primary text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-accent transition-colors">
            {movie.title}
          </h3>
        </Link>
        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
          {year ? <span>{year}</span> : null}
          {year && langName && <span>•</span>}
          {langName && <span className="font-medium">{langName}</span>}
          {movie.genres && movie.genres.length > 0 && (
            <>
              <span>•</span>
              <span className="truncate">{movie.genres[0]}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
