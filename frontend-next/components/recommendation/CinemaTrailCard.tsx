"use client";

import { Map, ArrowRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TrailMovie {
  tmdb_id: number;
  title?: string;
  year?: number;
  language?: string;
  poster_path?: string;
}

interface TransitionReason {
  from: string;
  to: string;
  reason: string;
}

export interface CinemaTrailProps {
  id: string;
  title?: string;
  name?: string;
  theme?: string;
  description: string;
  region?: string;
  themeTags?: string[];
  movies?: TrailMovie[];
  transitionReasons?: TransitionReason[];
  isEditorial?: boolean;
}

export default function CinemaTrailCard({ trail }: { trail: CinemaTrailProps }) {
  const getImageUrl = (path?: string) => 
    path ? `https://image.tmdb.org/t/p/w342${path}` : "/placeholder.png";

  const displayTitle = trail?.title || trail?.name || trail?.theme || "Cinema Trail";
  const displayRegion = trail?.region || "Global";
  const displayTags = trail?.themeTags || (trail?.theme ? [trail.theme] : ["Cinema"]);
  const displayMovies = trail?.movies || [];
  const displayTransitions = trail?.transitionReasons || [];

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-8 transition-all hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5">
      {/* Editorial Badge */}
      {trail?.isEditorial && (
        <div className="absolute top-0 right-8 rounded-b-lg bg-accent/20 px-3 py-1 border-b border-x border-accent/30">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
            <BookOpen className="h-3 w-3" />
            Editorial Curated
          </span>
        </div>
      )}

      <div className="mb-8 max-w-2xl">
        <div className="flex items-center gap-2 text-text-muted mb-3">
          <Map className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">{displayRegion}</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-text-primary mb-3">
          {displayTitle}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          {trail?.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {displayTags.map((tag: string) => (
            <span key={tag} className="rounded-full bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-border">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Trail Path Visualization */}
      <div className="relative mt-12 pb-4">
        {/* Connection Line */}
        <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-border sm:left-1/2 sm:-ml-[1px] sm:top-24 sm:bottom-auto sm:w-full sm:h-0.5 sm:left-10 sm:right-10" />

        <div className="flex flex-col gap-12 sm:flex-row sm:gap-4 sm:justify-between relative z-10">
          {displayMovies.map((movie: TrailMovie, idx: number) => {
            const nextTransition = displayTransitions.find((r: TransitionReason) => r.from === movie.title);
            
            return (
              <div key={movie.tmdb_id || idx} className="relative flex items-start gap-6 sm:flex-col sm:items-center sm:gap-4 sm:w-1/5 group/node">
                {/* Node Dot */}
                <div className="absolute left-6 top-10 h-3 w-3 -ml-[5px] rounded-full bg-surface border-2 border-accent z-20 sm:top-auto sm:bottom-auto sm:-translate-y-1/2 sm:left-1/2 transition-transform group-hover/node:scale-150 group-hover/node:bg-accent" />
                
                <Link href={`/movie/${movie.tmdb_id}`} className="shrink-0 w-24 h-36 relative rounded-xl overflow-hidden shadow-lg border border-border transition-transform hover:-translate-y-2 hover:shadow-accent/20 sm:w-full sm:aspect-[2/3] sm:h-auto z-30 bg-background">
                  <Image 
                    src={getImageUrl(movie.poster_path)}
                    alt={movie.title || "Movie"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 96px, 20vw"
                  />
                </Link>
                
                <div className="pt-2 sm:text-center sm:pt-4 z-30">
                  <Link href={`/movie/${movie.tmdb_id}`} className="hover:text-accent transition-colors">
                    <h4 className="font-bold text-text-primary text-sm line-clamp-2">{movie.title}</h4>
                  </Link>
                  <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider font-medium">
                    {movie.language?.toUpperCase()} {movie.year ? `• ${movie.year}` : ''}
                  </p>
                </div>

                {/* Transition Reason Text */}
                {nextTransition && (
                  <div className="sm:hidden mt-3 text-xs text-text-muted italic relative pl-4 border-l-2 border-border/50">
                    "{nextTransition.reason}"
                  </div>
                )}
                
                {nextTransition && (
                  <div className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 justify-center z-20">
                    <ArrowRight className="h-4 w-4 text-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
