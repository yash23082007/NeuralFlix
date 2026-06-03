"use client";

import { useRecommendations } from "../../hooks/useRecommendations";
import { Sparkles } from "lucide-react";
import MovieCard from "../MovieCard";
import { motion } from "framer-motion";
import ScrollReveal from "../ScrollReveal";

export default function PersonalizedRecommendations() {
  const { data, isLoading, error } = useRecommendations(8);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 backdrop-blur-sm relative overflow-hidden">
        {/* Animated scanning line */}
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-[var(--accent-sage)]/10 to-transparent pointer-events-none"
        />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-[var(--accent-sage)]/20 border-t-[var(--accent-sage)] animate-spin" />
            <Sparkles className="absolute inset-0 m-auto h-4 w-4 text-[var(--accent-sage)] animate-pulse" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)] font-sans">Analyzing your taste profile</p>
            <p className="text-xs text-[var(--text-tertiary)] font-sans">Consulting Neural Recommendation Engine...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.recommendations || data.recommendations.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 px-4 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)] font-sans">
          No recommendations available yet.
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-md font-sans">
          Sign in and rate at least a few films to initialize your personalized machine learning recommendation model.
        </p>
      </div>
    );
  }

  const recs = data.recommendations;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
  };

  return (
    <ScrollReveal>
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-[3px] rounded-full bg-gradient-to-b from-[var(--accent-sage)] to-[var(--accent-sage-dim)] shadow-[0_0_8px_var(--accent-sage)]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-sage)] bg-[var(--accent-sage)]/10 px-2 py-0.5 rounded-full border border-[var(--accent-sage)]/20">
                  ML Model
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-sage)] animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
                Personalized Picks
              </h2>
            </div>
          </div>
        </div>

        <div className="relative">
          {/* Subtle gradient fades on edges */}
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-[var(--surface-primary)] to-transparent pointer-events-none z-10" />
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-[var(--surface-primary)] to-transparent pointer-events-none z-10" />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="flex gap-5 overflow-x-auto pb-6 pt-2 px-4 -mx-4 snap-x scroll-smooth no-scrollbar"
          >
            {recs.map((movie: any) => (
              <motion.div 
                key={movie.tmdb_id || movie._id} 
                variants={itemVariants}
                className="snap-start shrink-0 w-[200px]"
              >
                <MovieCard
                  movie={{
                    ...movie,
                    rec_score: movie.score,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </ScrollReveal>
  );
}