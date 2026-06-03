"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Compass, FilmIcon, Globe2, SearchIcon, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${API}/api/v1/search/movies?query=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results?.slice(0, 6) || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // Handle ESC key to close
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-overlay)] text-[var(--text-primary)] shadow-2xl shadow-black/80 glass-card"
          >
            {/* Glowing neon accent bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent-warm)] to-transparent opacity-80" />

            <Command label="Search NeuralFlix" className="flex flex-col">
              <div className="flex items-center border-b border-[var(--border-subtle)] px-4 relative">
                <SearchIcon className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  className="w-full bg-transparent p-4 text-base outline-none placeholder:text-[var(--text-tertiary)] font-sans"
                  placeholder="Search films, regions, genres..."
                />
                
                {isLoading && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-warm)] border-t-transparent" />
                  </div>
                )}

                <button 
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-3" aria-live="polite">
                <Command.Empty className="py-8 text-center text-sm text-[var(--text-tertiary)] font-sans">
                  {query
                    ? "No films found matching your search."
                    : "Start typing to search the catalog."}
                </Command.Empty>

                {!query && (
                  <div className="space-y-2">
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">
                      Quick Access
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {[
                        { label: "Explore Catalog", href: "/discover", icon: Compass, color: "text-[var(--accent-blue)]" },
                        { label: "World Cinema Map", href: "/world-map", icon: Globe2, color: "text-[var(--accent-sage)]" },
                        {
                          label: "Hidden Gems",
                          href: "/search?mood=hidden_gems",
                          icon: TrendingUp,
                          color: "text-[var(--accent-warm)]",
                        },
                        {
                          label: "Award Winners",
                          href: "/search?mood=award_winners",
                          icon: TrendingUp,
                          color: "text-[var(--accent-rose)]",
                        },
                      ].map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.href}
                            onSelect={() => {
                              router.push(item.href);
                              setOpen(false);
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all duration-200"
                          >
                            <div className={`p-2 rounded-lg bg-[var(--surface-muted)] ${item.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium font-sans">{item.label}</span>
                          </Command.Item>
                        );
                      })}
                    </div>
                  </div>
                )}

                {query && results.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">
                      Films Found
                    </div>
                    <div className="space-y-1">
                      {results.map((movie, index) => (
                        <Command.Item
                          key={movie.tmdb_id || movie._id}
                          onSelect={() => {
                            router.push(`/movie/${movie.tmdb_id || movie._id}`);
                            setOpen(false);
                          }}
                          className="flex cursor-pointer items-center gap-4 rounded-xl px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-subtle)] transition-all duration-200"
                        >
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--surface-muted)] shadow-md">
                            {movie.poster_url ? (
                              <img
                                src={movie.poster_url}
                                alt={movie.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <FilmIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-base font-semibold font-sans text-[var(--text-primary)]">
                              {movie.title}
                            </span>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-tertiary)] font-sans">
                              <span>
                                {movie.year ||
                                  movie.release_date?.substring(0, 4) ||
                                  "Film"}
                              </span>
                              <span>•</span>
                              <span className="uppercase">{movie.language || "EN"}</span>
                              {movie.vote_average && (
                                <>
                                  <span>•</span>
                                  <span className="text-[var(--accent-warm)] font-medium">
                                    ★ {movie.vote_average.toFixed(1)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </Command.Item>
                      ))}
                    </div>
                  </div>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
