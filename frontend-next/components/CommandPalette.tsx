"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { BarChart3, FilmIcon, Globe2, SearchIcon } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<any[]>([]);
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
      return;
    }

    const fetchResults = async () => {
      try {
        const res = await fetch(`${API}/api/search/movies?query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results?.slice(0, 6) || []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const timeout = setTimeout(fetchResults, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/35 p-4 pt-[15vh] backdrop-blur-sm">
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <Command
        className="premium-card relative z-50 w-full max-w-2xl overflow-hidden rounded-lg text-text-primary"
        label="NeuralFlix command menu"
      >
        <div className="flex items-center border-b border-border px-3">
          <SearchIcon className="h-5 w-5 shrink-0 text-text-muted" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            className="w-full bg-transparent p-4 text-sm outline-none placeholder:text-text-muted"
            placeholder="Search catalog, regions, or model signals"
          />
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-center text-sm text-text-muted">
            {query ? "No catalog matches found." : "Start with a film, region, or signal."}
          </Command.Empty>

          {!query && (
            <>
              <Command.Group heading="Catalog" className="px-2 py-2 text-xs font-bold text-text-muted">
                {[
                  { label: "Explore catalog", href: "/discover", icon: FilmIcon },
                  { label: "Global cinema map", href: "/world-map", icon: Globe2 },
                  { label: "Long-tail gems", href: "/search?mood=hidden_gems", icon: BarChart3 },
                  { label: "Critical acclaim", href: "/search?mood=award_winners", icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href}
                      onSelect={() => {
                        router.push(item.href);
                        setOpen(false);
                      }}
                      className="mt-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
                    >
                      <Icon className="h-4 w-4 text-accent" />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </>
          )}

          {query && results.length > 0 && (
            <Command.Group heading="Movies" className="px-2 py-2 text-xs text-text-muted">
              {results.map((movie) => (
                <Command.Item
                  key={movie.tmdb_id || movie._id}
                  onSelect={() => {
                    router.push(`/movie/${movie.tmdb_id || movie._id}`);
                    setOpen(false);
                  }}
                  className="mt-1 flex cursor-pointer items-center gap-4 rounded-md px-3 py-3 text-sm text-text-primary hover:bg-bg-elevated"
                >
                  {movie.poster_url ? (
                    <img src={movie.poster_url} alt={movie.title} className="h-12 w-8 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-8 items-center justify-center rounded bg-bg-elevated">
                      <FilmIcon className="h-4 w-4 text-text-muted" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate font-bold">{movie.title}</span>
                    <span className="text-xs text-text-muted">
                      {movie.year || movie.release_date?.substring(0, 4) || "Film"} / {movie.language?.toUpperCase() || "ML"}
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
