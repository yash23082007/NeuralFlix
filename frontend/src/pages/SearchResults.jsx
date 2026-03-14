import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchMovies } from '../services/api';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performSearch = async () => {
      if (!query) {
        setMovies([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const data = await fetchMovies(1, 20, query);
        setMovies(data);
      } catch (error) {
        console.error('Error during search:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Search Results for <span className="text-primary tracking-wide">"{query}"</span>
        </h1>
        <p className="text-textSecondary">Found {movies.length} movies</p>
      </motion.div>

      {loading ? (
        <Loader />
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-textSecondary text-xl">
          No movies found matching your search.
        </div>
      )}
    </div>
  );
};

export default SearchResults;
