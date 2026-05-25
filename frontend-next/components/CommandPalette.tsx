"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Compass, FilmIcon, Globe2, SearchIcon, TrendingUp } from "lucide-react";

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
        const res = await fetch(
          `${API}/api/v1/search/movies?query=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results?.slice(0, 6) || []);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const timeout = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-[15vh] backdrop-blur-sm">
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <Command
        className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-2xl"
        label="Search NeuralFlix"
      >
        <div className="flex items-center border-b border-[var(--border-subtle)] px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            className="w-full bg-transparent p-4 text-sm outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Search films, regions, genres..."
          />
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
          <Command.Empty className="p-6 text-center text-sm text-[var(--text-tertiary)]">
            {query
              ? "No films found matching your search."
              : "Start typing to search the catalog."}
          </Command.Empty>

          {!query && (
            <Command.Group
              heading="Quick Access"
              className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
            >
              {[
                { label: "Explore Catalog", href: "/discover", icon: Compass },
                { label: "World Cinema Map", href: "/world-map", icon: Globe2 },
                {
                  label: "Hidden Gems",
                  href: "/search?mood=hidden_gems",
                  icon: TrendingUp,
                },
                {
                  label: "Award Winners",
                  href: "/search?mood=award_winners",
                  icon: TrendingUp,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    onSelect={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                    className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--accent-warm)]" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {query && results.length > 0 && (
            <Command.Group
              heading="Results"
              className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
            >
              {results.map((movie) => (
                <Command.Item
                  key={movie.tmdb_id || movie._id}
                  onSelect={() => {
                    router.push(`/movie/${movie.tmdb_id || movie._id}`);
                    setOpen(false);
                  }}
                  className="mt-1 flex cursor-pointer items-center gap-4 rounded-lg px-3 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                >
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="h-12 w-8 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-8 items-center justify-center rounded-md bg-[var(--surface-muted)]">
                      <FilmIcon className="h-4 w-4 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block truncate font-semibold">
                      {movie.title}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {movie.year ||
                        movie.release_date?.substring(0, 4) ||
                        "Film"}{" "}
                      ·{" "}
                      {movie.language?.toUpperCase() || "EN"}
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
