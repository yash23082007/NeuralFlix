import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchMovies } from '../services/api';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
];

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [lang, setLang] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!query) return;
    const doSearch = async () => {
      setLoading(true);
      setPage(1);
      try {
        const data = await searchMovies(query, lang, 1);
        setResults(data);
        setHasMore(data.length >= 10);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    doSearch();
  }, [query, lang]);

  const loadMore = async () => {
    const nextPage = page + 1;
    const data = await searchMovies(query, lang, nextPage);
    setResults(prev => [...prev, ...data]);
    setPage(nextPage);
    setHasMore(data.length >= 10);
  };

  return (
    <div className="min-h-screen px-6 md:px-12 py-8 pt-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Search className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-black text-white">
            {query ? (
              <>Search: <span className="text-gradient">{query}</span></>
            ) : (
              'Search'
            )}
          </h1>
        </div>
        {results.length > 0 && (
          <p className="text-gray-400 text-sm">{results.length} results found</p>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 mb-8 flex-wrap"
      >
        <span className="flex items-center gap-2 text-gray-400 text-sm">
          <SlidersHorizontal className="w-4 h-4" /> Filter:
        </span>
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
              lang === l.code
                ? 'bg-primary border-primary text-white'
                : 'border-white/15 text-gray-300 hover:border-white/40 hover:text-white'
            }`}
          >
            {l.label}
          </button>
        ))}
        {lang && (
          <button onClick={() => setLang('')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </motion.div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24"
        >
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-xl font-bold text-white mb-2">No results for "{query}"</div>
          <div className="text-gray-400">Try a different title, actor, or genre</div>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((movie, i) => (
              <MovieCard key={movie.tmdb_id || movie._id || i} movie={movie} index={i} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={loadMore}
                className="px-8 py-3 bg-surface border border-white/15 text-white rounded-xl hover:bg-surface-2 hover:border-white/30 transition font-medium"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchResults;
