import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Play, Info } from 'lucide-react';

const PLATFORM_COLORS = {
  'Netflix': 'platform-netflix',
  'Amazon Prime Video': 'platform-prime',
  'Disney+': 'platform-disney',
  'Apple TV+': 'platform-apple',
  'HBO Max': 'platform-hbo',
};

const getMovieId = (movie) => movie.tmdb_id || movie._id || movie.id;

const MovieCard = ({ movie, index = 0 }) => {
  const id = getMovieId(movie);
  const posterUrl = movie.poster_url || movie.poster_path
    ? (movie.poster_url || `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
    : null;

  const year = movie.year || (movie.release_date ? movie.release_date.split('-')[0] : null);
  const rating = movie.rating ?? movie.vote_average ?? 0;
  const platforms = movie.platforms || [];
  const topPlatform = platforms[0] || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="movie-card-wrap group relative rounded-xl overflow-hidden bg-surface card-glow smooth-transition cursor-pointer flex-shrink-0"
      style={{ minWidth: 0 }}
    >
      <Link to={`/movie/${id}`} className="block h-full">
        {/* Poster */}
        <div className="aspect-[2/3] relative overflow-hidden bg-surface-2">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-110 smooth-transition duration-700"
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-2">
              <div className="text-text-muted text-center p-4">
                <div className="text-4xl mb-2">🎬</div>
                <div className="text-xs line-clamp-2">{movie.title}</div>
              </div>
            </div>
          )}

          {/* Dark overlay on hover */}
          <div className="card-hover-overlay absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

          {/* Rating badge - top right */}
          {rating > 0 && (
            <div className="absolute top-2 right-2 rating-badge flex items-center gap-1 opacity-0 group-hover:opacity-100 smooth-transition">
              <Star className="w-3 h-3 fill-current" />
              {Number(rating).toFixed(1)}
            </div>
          )}

          {/* Platform badge - top left */}
          {topPlatform && (
            <div className={`absolute top-2 left-2 px-2 py-0.5 text-white text-xs font-bold rounded ${PLATFORM_COLORS[topPlatform] || 'platform-default'} opacity-0 group-hover:opacity-100 smooth-transition`}>
              {topPlatform.replace('Amazon Prime Video', 'Prime').replace('Disney+', 'Disney+')}
            </div>
          )}

          {/* Hover Overlay Content */}
          <div className="card-hover-overlay absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 smooth-transition">
            <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 mb-1">{movie.title}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
              {year && <span>{year}</span>}
              {rating > 0 && (
                <span className="flex items-center gap-0.5 text-yellow-400">
                  <Star className="w-3 h-3 fill-current" />
                  {Number(rating).toFixed(1)}
                </span>
              )}
            </div>
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {movie.genres.slice(0, 2).map(g => (
                  <span key={g} className="text-[10px] bg-white/15 text-white px-1.5 py-0.5 rounded-full">{g}</span>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 mt-2">
              <div className="flex-1 flex items-center justify-center gap-1 bg-white text-black text-xs font-bold py-1.5 rounded-md">
                <Play className="w-3 h-3 fill-current" /> Play
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default MovieCard;
