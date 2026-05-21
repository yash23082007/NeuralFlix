'use client';
import { useRecommendations } from "../../hooks/useRecommendations";
import { Loader } from "lucide-react";
import MovieCard from "../MovieCard";

export default function PersonalizedRecommendations() {
  const { data, isLoading, error } = useRecommendations(6);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-5 w-5 animate-spin text-[var(--accent-warm)]" />
          <p className="text-xs text-[var(--text-tertiary)]">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.recommendations || data.recommendations.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-[var(--text-tertiary)]">
          Sign in and rate some films to get personalized recommendations.
        </p>
      </div>
    );
  }

  const recs = data.recommendations;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-5 w-[3px] rounded-full bg-gradient-to-b from-[var(--accent-sage)] to-[var(--accent-sage-dim)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-sage)]">
            ML Picks
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] mt-0.5">
            Recommended for You
          </h2>
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-5 overflow-x-auto pb-6 pt-2 px-1 snap-x scroll-smooth no-scrollbar">
          {recs.map((movie: any) => (
            <div key={movie.tmdb_id} className="snap-start shrink-0 w-[200px]">
              <MovieCard
                movie={{
                  ...movie,
                  rec_score: movie.score,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}