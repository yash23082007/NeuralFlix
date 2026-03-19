import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMovieDetails, fetchRecommendations } from '../services/api';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import TrailerModal from '../components/TrailerModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Calendar, Clock, Play, Globe, Tv, Film, ChevronRight } from 'lucide-react';

const PLATFORM_COLORS = {
  'Netflix': 'bg-red-600',
  'Amazon Prime Video': 'bg-blue-500',
  'Disney+': 'bg-blue-700',
  'Apple TV+': 'bg-gray-600',
  'HBO Max': 'bg-purple-700',
  'Hotstar': 'bg-blue-600',
  'JioCinema': 'bg-purple-600',
};

const MovieDetails = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

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

        if (recommendationsData?.recommendations?.length) {
          setRecommendations(recommendationsData.recommendations);
        } else if (detailsData?.similar?.length) {
          setRecommendations(detailsData.similar);
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
  if (!movie) return (
    <div className="text-center py-32">
      <div className="text-6xl mb-4">🎬</div>
      <div className="text-2xl font-bold text-white mb-2">Movie not found</div>
      <Link to="/" className="text-primary hover:underline">Go Home</Link>
    </div>
  );

  const backdropUrl = movie.backdrop_url || '';
  const posterUrl   = movie.poster_url || '';
  const rating      = movie.rating ?? 0;
  const year        = movie.year || (movie.release_date ? movie.release_date.split('-')[0] : '');
  const genres      = movie.genres || [];
  const cast        = movie.cast || [];
  const platforms   = movie.platforms || [];

  return (
    <div className="pb-16 -mt-16 page-enter">
      {/* Backdrop Hero */}
      <div className="relative w-full h-[60vh] lg:h-[75vh]">
        <div className="absolute inset-0">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover object-center"
            />
          ) : posterUrl ? (
            <img src={posterUrl} alt={movie.title} className="w-full h-full object-cover blur-sm scale-110 opacity-60" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-12 pb-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row gap-8 items-end"
          >
            {/* Poster */}
            {posterUrl && (
              <div className="hidden md:block shrink-0 w-52 lg:w-64 rounded-2xl overflow-hidden shadow-2xl border border-white/10 -mb-12 z-10">
                <img src={posterUrl} alt={movie.title} className="w-full object-cover" />
              </div>
            )}

            <div className="max-w-3xl">
              {movie.tagline && (
                <p className="text-primary/90 italic text-sm mb-2">{movie.tagline}</p>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight drop-shadow-lg">
                {movie.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300 mb-4 font-medium">
                {rating > 0 && (
                  <span className="flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-yellow-300 font-bold">{Number(rating).toFixed(1)}</span>
                    <span className="text-gray-400 text-xs">({(movie.votes || 0).toLocaleString()})</span>
                  </span>
                )}
                {year && (
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 opacity-60" />{year}</span>
                )}
                {movie.runtime > 0 && (
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 opacity-60" />{movie.runtime} min</span>
                )}
                {movie.language && (
                  <span className="flex items-center gap-1.5 uppercase text-xs">
                    <Globe className="w-4 h-4 opacity-60" />{movie.language}
                  </span>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-5">
                {genres.map(genre => (
                  <Link
                    key={genre}
                    to={`/genre/${genre.toLowerCase()}`}
                    className="px-3 py-1 bg-white/10 border border-white/15 rounded-full text-sm hover:bg-white/20 hover:border-white/30 transition"
                  >
                    {genre}
                  </Link>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {movie.trailer_key && (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowTrailer(true)}
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/90 shadow-2xl transition"
                  >
                    <Play className="w-5 h-5 fill-current" /> Watch Trailer
                  </motion.button>
                )}
                <Link to={`/search?q=${encodeURIComponent(movie.title)}`}>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 bg-white/15 backdrop-blur text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/25 border border-white/20 transition"
                  >
                    <Film className="w-5 h-5" /> Find Similar
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Left: Overview + Cast */}
          <div className="md:col-span-2 space-y-10">
            {/* Overview */}
            {movie.overview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-xl font-bold text-white mb-3 border-l-4 border-primary pl-4">Overview</h2>
                <p className="text-gray-300 leading-relaxed text-base">{movie.overview}</p>
              </motion.div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-xl font-bold text-white mb-4 border-l-4 border-accent pl-4">Cast</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                  {cast.map((actor, i) => (
                    <div key={i} className="flex-shrink-0 text-center w-20">
                      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-surface-2 mb-2 border-2 border-white/10">
                        {actor.profile_url ? (
                          <img src={actor.profile_url} alt={actor.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-white line-clamp-2 leading-tight">{actor.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{actor.character}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Info Panel */}
          <div className="space-y-6">
            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface border border-white/8 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-white">Movie Info</h3>
              {movie.director && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Director</div>
                  <div className="font-medium text-white">{movie.director}</div>
                </div>
              )}
              {year && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Year</div>
                  <div className="font-medium text-white">{year}</div>
                </div>
              )}
              {movie.runtime > 0 && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Runtime</div>
                  <div className="font-medium text-white">{movie.runtime} min ({Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m)</div>
                </div>
              )}
              {movie.language && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Language</div>
                  <div className="font-medium text-white uppercase">{movie.language}</div>
                </div>
              )}
              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm font-bold mt-2 transition"
                >
                  <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded font-black">IMDb</span>
                  View on IMDb <ChevronRight className="w-4 h-4" />
                </a>
              )}
            </motion.div>

            {/* Platforms */}
            {platforms.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface border border-white/8 rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-4">Available On</h3>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <span
                      key={p}
                      className={`${PLATFORM_COLORS[p] || 'bg-white/15'} text-white text-xs font-bold px-3 py-1.5 rounded-lg`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16"
          >
            <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-primary pl-4">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recommendations.slice(0, 12).map((rec, i) => (
                <MovieCard key={rec.tmdb_id || rec._id || i} movie={rec} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Trailer Modal */}
      <AnimatePresence>
        {showTrailer && movie.trailer_key && (
          <TrailerModal trailerKey={movie.trailer_key} onClose={() => setShowTrailer(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MovieDetails;
