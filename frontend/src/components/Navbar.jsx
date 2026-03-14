import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Clapperboard } from 'lucide-react';

const Navbar = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Clapperboard className="w-8 h-8 text-primary group-hover:scale-110 smooth-transition" />
          <span className="text-2xl font-bold tracking-tight text-white group-hover:text-primary smooth-transition">
            CineRecommender
          </span>
        </Link>
        <form onSubmit={handleSearch} className="relative w-full max-w-sm ml-8">
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface text-white placeholder-textSecondary border border-white/10 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-primary smooth-transition"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-textSecondary" />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>
    </nav>
  );
};

export default Navbar;
