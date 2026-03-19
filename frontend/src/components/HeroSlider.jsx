import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const HeroSlider = ({ movies = [] }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const heroMovies = movies.slice(0, 6);

  const goTo = useCallback((idx, dir = 1) => {
    setDirection(dir);
    setCurrent(idx);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % heroMovies.length, 1);
  }, [current, heroMovies.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + heroMovies.length) % heroMovies.length, -1);
  }, [current, heroMovies.length, goTo]);

  // Auto-rotate every 7 seconds
  useEffect(() => {
    if (heroMovies.length <= 1) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next, heroMovies.length]);

  if (!heroMovies.length) return (
    <div className="w-full h-[70vh] bg-surface animate-pulse" />
  );

  const movie = heroMovies[current];
  const backdropUrl = movie.backdrop_url || (movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null);
  const posterUrl   = movie.poster_url  || (movie.poster_path   ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`      : null);
  const id          = movie.tmdb_id || movie._id || movie.id;
  const rating      = movie.rating ?? movie.vote_average ?? 0;
  const year        = movie.year || (movie.release_date ? movie.release_date.split('-')[0] : '');

  const slideVariants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 80 : -80 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit:  (d) => ({ opacity: 0, x: d > 0 ? -80 : 80, transition: { duration: 0.4 } }),
  };

  return (
    <div className="relative w-full h-[78vh] lg:h-[90vh] overflow-hidden bg-background">
      {/* Backdrop */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`bg-${current}`}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt=""
              className="w-full h-full object-cover object-center hero-bg"
            />
          ) : posterUrl ? (
            <img src={posterUrl} alt="" className="w-full h-full object-cover blur-md scale-110 opacity-50" />
          ) : (
            <div className="w-full h-full bg-surface-2" />
          )}
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end pb-28 px-6 md:px-12 max-w-6xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`content-${current}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(movie.genres || []).slice(0, 3).map(g => (
                <span key={g} className="text-xs font-semibold text-white/80 bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-4 drop-shadow-2xl" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.6)' }}>
              {movie.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-4 mb-5 text-sm md:text-base text-gray-300 font-medium">
              {rating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-yellow-400 font-bold">{Number(rating).toFixed(1)}</span>
                </span>
              )}
              {year && <span className="text-gray-400">{year}</span>}
              {movie.runtime && <span className="text-gray-400">{movie.runtime} min</span>}
            </div>

            {/* Overview */}
            <p className="max-w-xl md:max-w-2xl text-base md:text-lg text-gray-200 mb-8 line-clamp-3 leading-relaxed" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
              {movie.overview || 'Explore this featured title, now streaming on your favorite platform.'}
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <Link to={`/movie/${id}`}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 bg-white text-black px-7 py-3.5 rounded-lg font-bold text-base hover:bg-white/90 transition-all shadow-2xl"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </motion.button>
              </Link>
              <Link to={`/movie/${id}`}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 bg-white/15 text-white px-7 py-3.5 rounded-lg font-bold text-base hover:bg-white/25 backdrop-blur-sm border border-white/20 transition-all"
                >
                  <Info className="w-5 h-5" />
                  More Info
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Left / Right Arrows */}
      {heroMovies.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white border border-white/15 hover:bg-black/80 smooth-transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white border border-white/15 hover:bg-black/80 smooth-transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {heroMovies.length > 1 && (
        <div className="absolute bottom-8 left-6 md:left-12 z-20 flex items-center gap-2">
          {heroMovies.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              className={`dot-indicator ${i === current ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroSlider;
