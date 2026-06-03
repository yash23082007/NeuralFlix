"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import MovieCard from "./MovieCard";
import ScrollReveal from "./ScrollReveal";
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
    scrollRef.current.scrollBy({
      left: direction === "left" ? -600 : 600,
      behavior: "smooth",
    });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="space-y-5 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-[3px] rounded-full bg-gradient-to-b from-[var(--accent-warm)] to-[var(--accent-rose)] shadow-[0_0_8px_var(--accent-warm-glow)]" />
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {seeAllHref && (
              <Link
                href={seeAllHref}
                className="group flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-warm)]"
              >
                See All
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scroll("left")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scroll("right")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Gradient fade edges */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-[var(--surface-primary)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-[var(--surface-primary)] to-transparent z-10 pointer-events-none" />
          <div ref={scrollRef} className="scroll-row movie-row-snap">
            {movies.map((movie, i) => (
              <motion.div
                key={movie.tmdb_id || movie._id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 8) * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <MovieCard movie={movie} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
}
