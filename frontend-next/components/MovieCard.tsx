'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { StarIcon, PlayIcon, PlusIcon } from '@heroicons/react/24/solid';

interface Movie {
  title: string;
  poster_path: string;
  vote_average?: number;
  release_year?: string | number;
}

interface MovieCardProps {
  movie: Movie;
  rank?: number;
  aiScore?: number;
  explanation?: string;
}

export function MovieCard({ movie, rank, aiScore, explanation }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className='relative rounded-lg overflow-hidden cursor-pointer group'
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Rank badge */}
      {rank && rank <= 10 && (
        <div className='absolute top-2 left-2 z-10 bg-neural-crimson text-white text-xs font-bold px-2 py-1 rounded-full'>
          #{rank}
        </div>
      )}

      {/* Poster */}
      <Image
        src={https://image.tmdb.org/t/p/w500}
        alt={movie.title}
        width={300} height={450}
        className='w-full h-auto object-cover'
        loading='lazy'
      />

      {/* Hover overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-4'
          >
            <h3 className='text-white font-bold text-sm leading-tight mb-1'>
              {movie.title}
            </h3>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
