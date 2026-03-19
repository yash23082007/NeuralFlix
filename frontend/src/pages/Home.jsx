import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchTrending,
  fetchTopRated,
  fetchBollywood,
  fetchAnime,
  fetchByGenre,
  fetchNowPlaying,
} from '../services/api';
import HeroSlider from '../components/HeroSlider';
import HorizontalRow from '../components/HorizontalRow';
import Loader from '../components/Loader';
import { motion } from 'framer-motion';
import { TrendingUp, Star, Globe2, Swords, Heart, Ghost, Sparkles } from 'lucide-react';

const GENRE_ROWS = [
  { title: '⚔️ Action & Thriller', genre: 'Action', icon: Swords },
  { title: '💘 Romance', genre: 'Romance', icon: Heart },
  { title: '👻 Horror', genre: 'Horror', icon: Ghost },
  { title: '✨ Sci-Fi & Fantasy', genre: 'Sci-Fi', icon: Sparkles },
];

const Home = () => {
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [bollywood, setBollywood] = useState([]);
  const [anime, setAnime] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [genreRows, setGenreRows] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [trendingData, topRatedData, bollywoodData, animeData, nowPlayingData] = await Promise.all([
          fetchTrending(),
          fetchTopRated(),
          fetchBollywood(),
          fetchAnime(),
          fetchNowPlaying(),
        ]);
        setTrending(trendingData);
        setTopRated(topRatedData);
        setBollywood(bollywoodData);
        setAnime(animeData);
        setNowPlaying(nowPlayingData);

        // Load genre rows sequentially to avoid rate limiting
        const genres = {};
        for (const row of GENRE_ROWS) {
          try {
            const data = await fetchByGenre(row.genre);
            genres[row.genre] = data;
          } catch (e) {
            genres[row.genre] = [];
          }
        }
        setGenreRows(genres);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="pb-16 -mt-16">
      {/* Hero Slider */}
      {trending.length > 0 && (
        <HeroSlider movies={trending.slice(0, 7)} />
      )}

      <div className="space-y-2 mt-2">
        {/* Now Playing */}
        {nowPlaying.length > 0 && (
          <HorizontalRow
            title="🎬 Now In Cinemas"
            movies={nowPlaying}
            accentColor="#e50914"
          />
        )}

        {/* Trending */}
        {trending.length > 0 && (
          <HorizontalRow
            title="🔥 Trending This Week"
            movies={trending.slice(1, 21)}
            accentColor="#f5c518"
            viewAllLink="/search?q=trending"
          />
        )}

        {/* Top Rated */}
        {topRated.length > 0 && (
          <HorizontalRow
            title="⭐ Top Rated All Time"
            movies={topRated}
            accentColor="#8b5cf6"
          />
        )}

        {/* Genre Rows */}
        {GENRE_ROWS.map(row => (
          genreRows[row.genre]?.length > 0 && (
            <HorizontalRow
              key={row.genre}
              title={row.title}
              movies={genreRows[row.genre]}
              viewAllLink={`/genre/${row.genre.toLowerCase()}`}
            />
          )
        ))}

        {/* Bollywood */}
        {bollywood.length > 0 && (
          <HorizontalRow
            title="🎭 Bollywood Hits"
            movies={bollywood}
            accentColor="#ff6b35"
            viewAllLink="/search?q=bollywood"
          />
        )}

        {/* Anime */}
        {anime.length > 0 && (
          <HorizontalRow
            title="🍜 Japanese Anime"
            movies={anime}
            accentColor="#06b6d4"
            viewAllLink="/genre/animation"
          />
        )}
      </div>

      {/* Genre Grid Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="px-6 md:px-12 mt-12"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Browse by Genre</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { name: 'Action', emoji: '⚔️', color: 'from-red-900/60 to-red-800/40' },
            { name: 'Comedy', emoji: '😂', color: 'from-yellow-900/60 to-yellow-800/40' },
            { name: 'Drama', emoji: '🎭', color: 'from-purple-900/60 to-purple-800/40' },
            { name: 'Horror', emoji: '👻', color: 'from-gray-900/80 to-gray-800/60' },
            { name: 'Sci-Fi', emoji: '🚀', color: 'from-blue-900/60 to-blue-800/40' },
            { name: 'Romance', emoji: '💘', color: 'from-pink-900/60 to-pink-800/40' },
            { name: 'Animation', emoji: '🎨', color: 'from-green-900/60 to-green-800/40' },
            { name: 'Thriller', emoji: '🔍', color: 'from-orange-900/60 to-orange-800/40' },
            { name: 'Adventure', emoji: '🗺️', color: 'from-teal-900/60 to-teal-800/40' },
            { name: 'Crime', emoji: '🕵️', color: 'from-slate-900/80 to-slate-800/60' },
            { name: 'Fantasy', emoji: '🧙', color: 'from-indigo-900/60 to-indigo-800/40' },
            { name: 'Documentary', emoji: '🎥', color: 'from-zinc-900/60 to-zinc-800/40' },
          ].map(g => (
            <Link
              key={g.name}
              to={`/genre/${g.name.toLowerCase()}`}
              className={`bg-gradient-to-br ${g.color} border border-white/10 rounded-xl p-4 text-center hover:border-white/30 hover:scale-105 smooth-transition group`}
            >
              <div className="text-3xl mb-2">{g.emoji}</div>
              <div className="text-sm font-semibold text-white/90 group-hover:text-white">{g.name}</div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
