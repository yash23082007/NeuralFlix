import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Brain, Tv2, Film, ChevronDown, Home, Flame } from 'lucide-react';

const NAV_GENRES = [
  { name: 'Action', emoji: '⚔️' },
  { name: 'Sci-Fi', emoji: '🚀' },
  { name: 'Comedy', emoji: '😂' },
  { name: 'Horror', emoji: '👻' },
  { name: 'Romance', emoji: '💘' },
  { name: 'Animation', emoji: '🎨' },
  { name: 'Crime', emoji: '🕵️' },
  { name: 'Drama', emoji: '🎭' },
  { name: 'Thriller', emoji: '🔍' },
  { name: 'Fantasy', emoji: '🧙' },
  { name: 'Adventure', emoji: '🗺️' },
  { name: 'Documentary', emoji: '🎥' },
];

const Navbar = () => {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const genreRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close on route change
  useEffect(() => {
    setGenreOpen(false);
    setSearchOpen(false);
  }, [location]);

  // Close genre dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (genreRef.current && !genreRef.current.contains(e.target)) {
        setGenreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
      setSearchOpen(false);
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <motion.nav
      className={`sticky top-0 z-50 px-6 py-0 smooth-transition ${
        scrolled ? 'bg-background/95 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'bg-gradient-to-b from-black/70 to-transparent'
      }`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="max-w-8xl mx-auto flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="relative">
            <Brain className="w-8 h-8 text-primary group-hover:scale-110 smooth-transition" />
            <div className="absolute inset-0 blur-md opacity-50 group-hover:opacity-80 smooth-transition" style={{ background: '#e50914' }} />
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-gradient">Neural</span>
            <span className="text-primary glow-red">Flix</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1 ml-8">
          <Link to="/" className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white smooth-transition rounded-md hover:bg-white/8 flex items-center gap-1.5">
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link to="/series" className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white smooth-transition rounded-md hover:bg-white/8 flex items-center gap-1.5">
            <Tv2 className="w-4 h-4" /> Series
          </Link>
          <Link to="/search?q=trending" className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white smooth-transition rounded-md hover:bg-white/8 flex items-center gap-1.5">
            <Flame className="w-4 h-4" /> Trending
          </Link>

          {/* Genres dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setGenreOpen(!genreOpen)}
              className="px-3 py-2 text-sm font-medium text-white/80 hover:text-white smooth-transition rounded-md hover:bg-white/8 flex items-center gap-1.5"
            >
              <Film className="w-4 h-4" />
              Genres <ChevronDown className={`w-3.5 h-3.5 smooth-transition ${genreOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {genreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-full left-0 mt-2 w-56 glass rounded-xl p-2 shadow-2xl"
                >
                  <div className="grid grid-cols-2 gap-0.5">
                    {NAV_GENRES.map(g => (
                      <Link
                        key={g.name}
                        to={`/genre/${g.name.toLowerCase()}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-white/75 hover:text-white hover:bg-white/8 rounded-lg smooth-transition"
                      >
                        <span>{g.emoji}</span> {g.name}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Search */}
        <div className="flex items-center gap-3 ml-auto">
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.form
                key="search-form"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '300px', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSearch}
                className="relative overflow-hidden"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search movies, series..."
                  className="w-full bg-surface/90 backdrop-blur text-white placeholder-text-muted border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary smooth-transition"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 top-2 text-text-muted hover:text-white smooth-transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <motion.button
                key="search-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={openSearch}
                className="p-2 text-white/70 hover:text-white smooth-transition rounded-full hover:bg-white/10"
              >
                <Search className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
