import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMovieDetails, fetchRecommendations } from '../services/api';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';
import { Star, Calendar, Clock } from 'lucide-react';

const MovieDetails = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getDetailsAndRecommendations = async () => {
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const [detailsData, recommendationsData] = await Promise.all([
          fetchMovieDetails(id),
          fetchRecommendations(id)
        ]);

        if (detailsData && !detailsData.error) {
          setMovie(detailsData);
        }
        
        if (recommendationsData && recommendationsData.recommendations) {
          setRecommendations(recommendationsData.recommendations);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    getDetailsAndRecommendations();
  }, [id]);

  if (loading) return <Loader />;
  if (!movie) return <div className="text-center py-20 text-xl font-bold">Movie not found</div>;

  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` 
    : '';

  return (
    <div className="pb-16 -mt-20">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] lg:h-[80vh]">
        <div className="absolute inset-0">
          {backdropUrl && (
            <img 
              src={backdropUrl} 
              alt={movie.title} 
              className="w-full h-full object-cover" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end px-6 max-w-7xl mx-auto pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row gap-8 items-end"
          >
            {/* Poster for larger screens */}
            <div className="hidden md:block shrink-0 w-64 rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <img 
                src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'} 
                alt={movie.title} 
                className="w-full object-cover"
              />
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
                {movie.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-textSecondary mb-6 font-medium">
                <span className="flex items-center gap-1.5 text-yellow-500">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="text-white">{(movie.vote_average || 0).toFixed(1)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {movie.release_date?.split('-')[0] || 'Unknown'}
                </span>
                {movie.runtime > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {movie.runtime} min
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {(movie.genres || []).map(genre => (
                  <span key={genre.id} className="px-3 py-1 bg-surface border border-white/10 rounded-full text-sm">
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="text-lg text-gray-300 leading-relaxed text-shadow max-w-2xl">
                {movie.overview}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 mt-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-primary pl-4">
              More Like This
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {recommendations.slice(0, 10).map(rec => (
                <MovieCard key={rec.id} movie={rec} />
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
