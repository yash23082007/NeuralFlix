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
    const amount = 600;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="section-heading">{title}</h2>
        <div className="flex items-center gap-2">
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="text-xs text-accent hover:text-accent/80 font-semibold flex items-center gap-1 transition-colors"
            >
              See All <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded-full transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded-full transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Row */}
      <div ref={scrollRef} className="scroll-row movie-row-snap">
        {movies.map((movie) => (
          <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
        ))}
      </div>
    </section>
  );
}
