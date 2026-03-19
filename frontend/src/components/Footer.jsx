import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Github, Twitter, Instagram, Heart } from 'lucide-react';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Animation', 'Thriller'];

const Footer = () => (
  <footer className="border-t border-white/5 bg-surface/30 backdrop-blur-sm mt-auto">
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <Brain className="w-7 h-7 text-primary" />
            <span className="text-xl font-black">
              <span className="text-gradient">Neural</span>
              <span className="text-primary">Flix</span>
            </span>
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            AI-powered movie & web series recommendations. Discover your next favorite story across genres and platforms.
          </p>
          <div className="flex items-center gap-3">
            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition">
              <Github className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition">
              <Twitter className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center transition">
              <Instagram className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>

        {/* Browse Genres */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest opacity-60">Genres</h3>
          <ul className="space-y-2">
            {GENRES.map(g => (
              <li key={g}>
                <Link
                  to={`/genre/${g.toLowerCase()}`}
                  className="text-gray-400 hover:text-white text-sm transition"
                >
                  {g}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest opacity-60">Explore</h3>
          <ul className="space-y-2">
            <li><Link to="/" className="text-gray-400 hover:text-white text-sm transition">Home</Link></li>
            <li><Link to="/series" className="text-gray-400 hover:text-white text-sm transition">Web Series</Link></li>
            <li><Link to="/search?q=trending" className="text-gray-400 hover:text-white text-sm transition">Trending</Link></li>
            <li><Link to="/search?q=top rated" className="text-gray-400 hover:text-white text-sm transition">Top Rated</Link></li>
            <li><Link to="/search?q=bollywood" className="text-gray-400 hover:text-white text-sm transition">Bollywood</Link></li>
            <li><Link to="/genre/animation" className="text-gray-400 hover:text-white text-sm transition">Anime</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-gray-500 text-xs">
          © {new Date().getFullYear()} NeuralFlix. Powered by TMDB API. For educational purposes only.
        </p>
        <p className="text-gray-500 text-xs flex items-center gap-1.5">
          Made with <Heart className="w-3 h-3 text-primary fill-current" /> using React + FastAPI + MongoDB
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
