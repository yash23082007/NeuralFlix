"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { SearchIcon, FilmIcon, MapIcon, SparklesIcon } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const fetchResults = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/search/movies?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results?.slice(0, 5) || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setOpen(false)}
      />
      <Command 
        className="relative z-50 w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden text-text-primary"
        label="Global Cinema Command Menu"
      >
        <div className="flex items-center border-b border-border px-3">
          <SearchIcon className="w-5 h-5 text-text-muted flex-shrink-0" />
          <Command.Input 
            autoFocus
            value={query}
            onValueChange={setQuery}
            className="w-full bg-transparent p-4 outline-none placeholder:text-text-muted"
            placeholder="Search for movies, regions, or moods..." 
          />
        </div>
        
        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-row">
          <Command.Empty className="p-4 text-sm text-text-muted text-center">
            {query ? "No cinematic matches found." : "Start typing to explore world cinema."}
          </Command.Empty>

          {!query && (
            <>
              <Command.Group heading="Global Cinema 🌍" className="text-xs font-semibold text-text-muted px-2 py-2">
                <Command.Item 
                  onSelect={() => { router.push("/cinema/indian"); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-surface-light text-text-primary mt-1"
                >
                  <span className="text-lg">🇮🇳</span> Indian Cinema
                </Command.Item>
                <Command.Item 
                  onSelect={() => { router.push("/cinema/korean"); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-surface-light text-text-primary"
                >
                  <span className="text-lg">🇰🇷</span> Korean Cinema
                </Command.Item>
                <Command.Item 
                  onSelect={() => { router.push("/cinema/french"); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-surface-light text-text-primary"
                >
                  <span className="text-lg">🇫🇷</span> French Cinema
                </Command.Item>
              </Command.Group>

              <Command.Group heading="By Mood ✨" className="text-xs font-semibold text-text-muted px-2 py-2 border-t border-border mt-2">
                <Command.Item 
                  onSelect={() => { router.push("/mood/desi_vibes"); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-surface-light text-text-primary mt-1"
                >
                  <SparklesIcon className="w-4 h-4 text-accent" /> Desi Vibes
                </Command.Item>
                <Command.Item 
                  onSelect={() => { router.push("/mood/mind_blown"); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-surface-light text-text-primary"
                >
                  <SparklesIcon className="w-4 h-4 text-purple-400" /> Mind Blown
                </Command.Item>
              </Command.Group>
            </>
          )}

          {query && results.length > 0 && (
            <Command.Group heading="Movies 🎬" className="text-xs text-text-muted px-2 py-2">
              {results.map((movie) => (
                <Command.Item
                  key={movie.id || movie.tmdb_id}
                  onSelect={() => { router.push(`/movie/${movie.id || movie.tmdb_id}`); setOpen(false); }}
                  className="flex items-center gap-4 px-3 py-3 text-sm rounded-md cursor-pointer hover:bg-surface-light text-text-primary mt-1"
                >
                  {movie.poster_url || movie.poster_path ? (
                    <img src={movie.poster_url || `https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt={movie.title} className="w-8 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-8 h-12 bg-border rounded flex items-center justify-center">
                      <FilmIcon className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{movie.title}</span>
                    <span className="text-text-muted text-xs">
                      {movie.release_date?.substring(0,4)} • {movie.original_language?.toUpperCase()}
                    </span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
