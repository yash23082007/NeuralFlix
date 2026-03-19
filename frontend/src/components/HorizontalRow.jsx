import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MovieCard from './MovieCard';
import SkeletonCard from './SkeletonCard';
import { motion } from 'framer-motion';

const HorizontalRow = ({ title, movies = [], loading = false, accentColor, viewAllLink }) => {
  const rowRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const CARD_WIDTH = 224; // matches shrink-0 w-56

  const scroll = (direction) => {
    if (!rowRef.current) return;
    const amount = CARD_WIDTH * 3;
    rowRef.current.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
    setTimeout(() => {
      if (!rowRef.current) return;
      setCanScrollLeft(rowRef.current.scrollLeft > 0);
      setCanScrollRight(
        rowRef.current.scrollLeft + rowRef.current.clientWidth < rowRef.current.scrollWidth - 10
      );
    }, 400);
  };

  const onScroll = () => {
    if (!rowRef.current) return;
    setCanScrollLeft(rowRef.current.scrollLeft > 0);
    setCanScrollRight(
      rowRef.current.scrollLeft + rowRef.current.clientWidth < rowRef.current.scrollWidth - 10
    );
  };

  if (!loading && (!movies || movies.length === 0)) return null;

  return (
    <div className="mb-10 row-wrapper group">
      {/* Row Header */}
      <div className="flex items-center justify-between px-6 md:px-12 mb-4">
        <div className="flex items-center gap-3">
          {accentColor && (
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
          )}
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        </div>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition group/link"
          >
            See All <ChevronRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition" />
          </Link>
        )}
      </div>

      {/* Scrollable Row */}
      <div className="relative">
        {/* Left Arrow */}
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => scroll('left')}
            className="row-arrow left opacity-0 group-hover:opacity-90 z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => scroll('right')}
            className="row-arrow right opacity-0 group-hover:opacity-90 z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        )}

        <div
          ref={rowRef}
          onScroll={onScroll}
          className="flex overflow-x-auto gap-3 px-6 md:px-12 pb-4 hide-scrollbar"
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-40 md:w-44 lg:w-56 flex-shrink-0">
                  <SkeletonCard />
                </div>
              ))
            : movies.map((movie, i) => (
                <div key={movie.tmdb_id || movie._id || i} className="w-40 md:w-44 lg:w-56 flex-shrink-0">
                  <MovieCard movie={movie} index={i} />
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalRow;
