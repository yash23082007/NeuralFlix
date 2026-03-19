import React, { useState, useEffect } from 'react';
import { fetchSeries } from '../services/api';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { motion } from 'framer-motion';
import { Tv2 } from 'lucide-react';

const SeriesPage = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSeries(1);
        setSeries(data);
        setHasMore(data.length >= 18);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await fetchSeries(nextPage);
      setSeries(prev => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length >= 18);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-950/80 to-background pt-24 pb-12 px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-500/30 flex items-center justify-center">
              <Tv2 className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-black text-white">
                Web <span className="text-gradient">Series</span>
              </h1>
              <p className="text-gray-300 mt-1">Trending TV shows & web series streaming now</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 md:px-12 mt-8">
        {/* Series Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {series.map((show, i) => (
                <MovieCard key={show.tmdb_id || show._id || i} movie={show} index={i} />
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

export default SeriesPage;
