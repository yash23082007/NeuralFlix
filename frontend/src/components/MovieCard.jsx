import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const MovieCard = ({ movie }) => {
  const posterUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
    : 'https://via.placeholder.com/500x750?text=No+Poster';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative rounded-xl overflow-hidden bg-surface shadow-xl"
    >
      <Link to={`/movie/${movie.id}`}>
        <div className="aspect-[2/3] overflow-hidden">
          <img 
            src={posterUrl} 
            alt={movie.title} 
            className="w-full h-full object-cover group-hover:scale-110 smooth-transition duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 smooth-transition" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 smooth-transition">
          <h3 className="text-lg font-bold text-white line-clamp-1">{movie.title}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <span>{movie.release_date?.split('-')[0] || 'Unknown'}</span>
            {movie.vote_average > 0 && (
              <span className="flex items-center gap-1 text-yellow-500">
                <Star className="w-4 h-4 fill-current" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default MovieCard;
