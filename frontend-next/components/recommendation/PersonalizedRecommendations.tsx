'use client';
import { useRecommendations } from "../../hooks/useRecommendations";
import { Sparkles, Loader } from "lucide-react";
import MovieCard3D from "../three/MovieCard3D";

export default function PersonalizedRecommendations() {
  const { data, isLoading, error } = useRecommendations(6);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="animate-spin text-accent" />
      </div>
    );
  }

  if (error || !data || !data.recommendations || data.recommendations.length === 0) {
    return null;
  }

  const recs = data.recommendations;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500">For You</p>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">Neural Top Picks</h2>
        </div>
        <Sparkles className="ml-auto h-5 w-5 text-emerald-500" />
      </div>
      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-8 pt-4 px-2 snap-x scroll-smooth custom-scrollbar">
          {recs.map((movie: any) => (
            <div key={movie.tmdb_id} className="snap-start shrink-0">
               <MovieCard3D 
                 movie={{
                   ...movie,
                   id: movie.tmdb_id,
                   match_score: movie.score ? Math.round(movie.score * 100) : undefined // Convert to percentage
                 }} 
               />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}