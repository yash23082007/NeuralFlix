"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import MovieCard from "./MovieCard";
import { Movie } from "../lib/api";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  seeAllHref?: string;
}

export default function MovieRow({ title, movies, seeAllHref }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: direction === "left" ? -600 : 600, behavior: "smooth" });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-accent to-neural-purple" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="group flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent"
            >
              See All
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-all hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-all hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="scroll-row movie-row-snap">
        {movies.map((movie, i) => (
          <div key={movie.tmdb_id || movie._id || i} className="animate-fade-in-up" style={{ animationDelay: `${(i % 6) * 60}ms` }}>
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  );
}
