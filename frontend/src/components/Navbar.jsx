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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#060606]/95 backdrop-blur-md shadow-2xl border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent pt-2'
      }`}
    >
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        
        {/* Logo & Main Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="bg-imdb-gold text-black rounded px-2 py-1 font-bold tracking-tighter text-2xl font-sans group-hover:scale-105 transition-transform duration-300 shadow-[0_0_15px_rgba(245,197,24,0.3)]">
              NeuralFlix
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-6">
            <Link border="true" to="/" className="text-sm font-semibold text-white/70 hover:text-white transition-colors flex items-center gap-2">
              <Home className="w-4 h-4" /> Home
            </Link>
            <div className="relative" ref={genreRef}>
              <button
                onClick={() => setGenreOpen(!genreOpen)}
                className="text-sm font-semibold text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <Film className="w-4 h-4" /> Genres <ChevronDown className={`w-3.5 h-3.5 transition-transform ${genreOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {genreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-[2.5rem] left-0 mt-2 w-64 bg-[#111111] border border-white/5 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] p-3 grid grid-cols-2 gap-1 z-50"
                  >
                    {NAV_GENRES.map(g => (
                      <Link
                        key={g.name}
                        to={`/genre/${g.name.toLowerCase()}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <span className="text-lg">{g.emoji}</span> {g.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Central Search Bar (IMDb Style) */}
        <div className="flex-1 max-w-2xl mx-8 hidden md:block">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within:text-imdb-gold transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search movies, TV shows, and more..."
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white text-sm rounded-full focus:ring-1 focus:ring-imdb-gold focus:border-imdb-gold block pl-12 p-3 outline-none transition-all placeholder-white/40 shadow-inner"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Right side icons */}
        <div className="flex items-center gap-4">
          <Link to="/search?q=trending" className="hidden sm:flex text-sm font-semibold text-white/70 hover:text-white transition-colors items-center gap-2">
            <Flame className="w-4 h-4" /> Trending
          </Link>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-imdb-gold to-yellow-600 flex items-center justify-center cursor-pointer shadow-lg hover:shadow-[0_0_15px_rgba(245,197,24,0.4)] transition-shadow">
            <span className="text-black font-bold text-sm">U</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
