"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Film, Menu, X, User } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setMobileOpen(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/?section=trending", label: "Trending" },
    { href: "/?section=toprated", label: "Top Rated" },
    { href: "/?section=indian", label: "Indian" },
    { href: "/?section=anime", label: "Anime" },
    { href: "/?section=series", label: "TV Series" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-border shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-14 gap-4">
          {/* Premium Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-700 text-black font-black text-xl px-2.5 py-1 rounded shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-105 transition-transform duration-300">
              NF
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-yellow-500 font-black text-lg tracking-wider uppercase">
                NEURAL
              </span>
              <span className="text-white font-bold text-xs tracking-[0.2em] -mt-0.5">
                FLIX
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-white hover:bg-surface-hover rounded transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, shows..."
                className="w-full bg-[#2a2a2a] border border-border rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-text-muted outline-none focus:border-imdb-gold/50 transition-colors"
              />
            </div>
          </form>

          {/* Right Side */}
          <div className="flex items-center gap-2 ml-auto">
            <button className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-light border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:border-imdb-gold/30 transition-colors">
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-text-secondary hover:text-white"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-[#1a1a1a] px-4 py-3 space-y-2">
          <form onSubmit={handleSearch}>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#2a2a2a] border border-border rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-text-muted outline-none"
              />
            </div>
          </form>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-text-secondary hover:text-white hover:bg-surface-hover rounded transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
