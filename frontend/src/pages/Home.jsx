import React, { useState, useEffect } from 'react';
import { fetchMovies } from '../services/api';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const HorizontalRow = ({ title, movies }) => {
  if (!movies || movies.length === 0) return null;
  
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 px-6 md:px-12">{title}</h2>
      <div className="flex overflow-x-auto gap-4 px-6 md:px-12 pb-6 hide-scrollbar">
        {movies.map((movie) => (
          <div key={movie.id || movie._id} className="w-40 md:w-48 lg:w-56 flex-shrink-0">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const [trending, setTrending] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [sciFiMovies, setSciFiMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getMovies = async () => {
      try {
        const data = await fetchMovies(1);
        setTrending(data);
        
        // Simulating different categories from the same generic fetch for now
        // In a real app, these would be specific endpoint queries
        setActionMovies([...data].sort(() => 0.5 - Math.random()).slice(0, 10));
        setSciFiMovies([...data].reverse().slice(0, 10));
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    getMovies();
  }, []);

  if (loading) return <Loader />;

  const heroMovie = trending.length > 0 ? trending[0] : null;

  return (
    <div className="pb-12 -mt-20">
      {/* Dynamic Hero Banner */}
      {heroMovie && (
        <div className="relative w-full h-[70vh] lg:h-[85vh] mb-12">
          <div className="absolute inset-0">
            <img 
              src={heroMovie.poster_path ? `https://image.tmdb.org/t/p/original${heroMovie.poster_path}` : 'https://via.placeholder.com/1920x1080?text=No+Backdrop'} 
              alt={heroMovie.title} 
              className="w-full h-full object-cover object-top opacity-60" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-12 pb-24 max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl">
                {heroMovie.title}
              </h1>
              <p className="max-w-xl text-lg md:text-xl text-gray-200 mb-8 line-clamp-3 drop-shadow-md">
                {heroMovie.overview || "Explore this trending title available now on your favorite platform."}
              </p>
              <div className="flex items-center gap-4">
                <Link to={`/movie/${heroMovie.id || heroMovie._id}`}>
                  <button className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-md font-bold text-lg hover:bg-white/80 transition shadow-lg">
                    <Play className="w-6 h-6 fill-current" /> Play
                  </button>
                </Link>
                <Link to={`/movie/${heroMovie.id || heroMovie._id}`}>
                  <button className="flex items-center gap-2 bg-gray-500/50 text-white px-8 py-3 rounded-md font-bold text-lg hover:bg-gray-500/70 backdrop-blur-sm transition">
                    <Info className="w-6 h-6" /> More Info
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Horizontal Scrolling Rows */}
      <HorizontalRow title="Trending Now" movies={trending.slice(1, 15)} />
      <HorizontalRow title="Top Sci-Fi" movies={sciFiMovies} />
      <HorizontalRow title="Action Packed" movies={actionMovies} />
      <HorizontalRow title="Because you watched Inception" movies={trending.slice(5, 15)} />
      
    </div>
  );
};

export default Home;
