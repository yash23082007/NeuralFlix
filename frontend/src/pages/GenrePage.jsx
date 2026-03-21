import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchByGenre } from '../services/api';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { motion } from 'framer-motion';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';

const GENRE_META = {
  action:      { emoji: '⚔️', color: 'from-red-900 to-background', accent: '#e50914' },
  comedy:      { emoji: '😂', color: 'from-yellow-900 to-background', accent: '#f5c518' },
  drama:       { emoji: '🎭', color: 'from-purple-900 to-background', accent: '#8b5cf6' },
  horror:      { emoji: '👻', color: 'from-gray-900 to-background', accent: '#6b6b80' },
  'sci-fi':    { emoji: '🚀', color: 'from-blue-900 to-background', accent: '#06b6d4' },
  romance:     { emoji: '💘', color: 'from-pink-900 to-background', accent: '#ec4899' },
  animation:   { emoji: '🎨', color: 'from-green-900 to-background', accent: '#22c55e' },
  thriller:    { emoji: '🔍', color: 'from-orange-900 to-background', accent: '#f97316' },
  adventure:   { emoji: '🗺️', color: 'from-teal-900 to-background', accent: '#14b8a6' },
  crime:       { emoji: '🕵️', color: 'from-slate-900 to-background', accent: '#94a3b8' },
  fantasy:     { emoji: '🧙', color: 'from-indigo-900 to-background', accent: '#6366f1' },
  documentary: { emoji: '🎥', color: 'from-zinc-900 to-background', accent: '#a1a1aa' },
};

const LANGUAGES = [
  { code: '', label: 'All' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
];

const GenrePage = () => {
  const { genre } = useParams();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lang, setLang] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const meta = GENRE_META[genre?.toLowerCase()] || { emoji: '🎬', color: 'from-surface to-background', accent: '#e50914' };
  const displayName = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : 'Genre';

  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchByGenre(displayName, 1, lang);
        setMovies(data);
        setHasMore(data.length >= 18);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [genre, lang, displayName]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await fetchByGenre(displayName, nextPage, lang);
      setMovies(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length >= 18);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Banner */}
      <div className={`bg-gradient-to-b ${meta.color} pt-24 pb-12 px-6 md:px-12`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">Genres</span>
            <ChevronRight className="w-4 h-4" />
            <span style={{ color: meta.accent }} className="font-bold">{displayName}</span>
          </div>

          <div className="text-6xl mb-3">{meta.emoji}</div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-3">
            {displayName} <span className="text-gradient">Movies</span>
          </h1>
          <p className="text-gray-300 text-base max-w-xl">
            Explore the best {displayName.toLowerCase()} movies and series curated for you.
          </p>
        </motion.div>
      </div>

      <div className="px-6 md:px-12 mt-8">
        {/* Language Filter */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <span className="flex items-center gap-2 text-gray-400 text-sm">
            <SlidersHorizontal className="w-4 h-4" /> Language:
          </span>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                lang === l.code
                  ? 'text-white border-2'
                  : 'border-white/15 text-gray-300 hover:border-white/40 hover:text-white'
              }`}
              style={lang === l.code ? { borderColor: meta.accent, backgroundColor: meta.accent + '30' } : {}}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">{meta.emoji}</div>
            <div className="text-xl font-bold text-white">No {displayName} movies found</div>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {movies.map((movie, i) => (
                <MovieCard key={movie.tmdb_id || movie._id || i} movie={movie} index={i} />
              ))}
            </motion.div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-surface border border-white/15 text-white rounded-xl hover:bg-surface-2 hover:border-white/30 transition font-medium disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GenrePage;
