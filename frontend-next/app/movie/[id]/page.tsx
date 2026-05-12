"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ChevronLeft, Clock, Film, Sparkles } from "lucide-react";
import MovieRow from "../../../components/MovieRow";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MovieDetail {
  tmdb_id: number;
  title: string;
  overview: string;
  tagline?: string;
  rating: number;
  votes: number;
  year?: number;
  release_date?: string;
  runtime?: number;
  genres: string[];
  poster_url?: string;
  backdrop_url?: string;
  director?: string;
  cast?: { name: string; character: string; profile_url?: string }[];
  trailer_key?: string;
  platforms?: string[];
  similar?: any[];
  omdb_rating?: string;
  rt_rating?: string;
  metacritic?: number;
  box_office?: string;
  awards?: string;
}

export default function MovieDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get("type") || "movie";
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchMovie() {
      setLoading(true);
      try {
        const [movieRes, recRes] = await Promise.all([
          fetch(`${API}/api/movies/${id}?media_type=${type}`),
          fetch(`${API}/api/recommendations/${id}?media_type=${type}`),
        ]);
        const movieData = await movieRes.json();
        setMovie(movieData?.error ? null : movieData);

        if (recRes.ok) {
          const recData = await recRes.json();
          setRecommendations(recData.recommendations || []);
        }
      } catch (err) {
        console.error("Failed to fetch movie:", err);
        setMovie(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [id, type]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-text-muted">Loading film data...</p>
        </div>
      </main>
    );
  }

  if (!movie?.title) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white text-text-muted shadow-card">
          <Film className="h-7 w-7" />
        </div>
        <p className="font-medium text-text-secondary">Movie not found in catalog</p>
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-95">
          <ChevronLeft className="h-4 w-4" /> Back to Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background page-enter">
      <section className="relative h-[55vh] md:h-[70vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          {movie.backdrop_url ? (
            <Image src={movie.backdrop_url} alt={movie.title} fill className="object-cover object-top opacity-60 saturate-[1.2] transition-transform duration-1000 page-enter-scale" priority />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-bg-elevated to-bg-surface" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent md:via-background/10 md:w-3/4" />
          <div className="film-grain absolute inset-0 opacity-[0.15]" />
        </div>

        <Link href="/" className="absolute left-6 top-6 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white shadow-card backdrop-blur-md transition-all hover:bg-white hover:text-black">
          <ChevronLeft className="h-4 w-4" /> Back to Home
        </Link>
      </section>

      <div className="relative z-10 mx-auto -mt-48 max-w-6xl px-4 md:px-8 pb-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-end">
          <div className="mx-auto shrink-0 md:mx-0 group perspective-1000">
            <div className="relative flex aspect-[2/3] w-[240px] items-center justify-center overflow-hidden rounded-2xl border-4 border-white/10 bg-bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:rotate-y-6 group-hover:-translate-y-2 md:w-[300px]">
              {movie.poster_url ? (
                <Image src={movie.poster_url} alt={movie.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <Film className="h-16 w-16 text-text-muted" />
              )}
              {/* Premium glare effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
          </div>

          <div className="flex-1 space-y-6 pb-4">
            <div className="space-y-2">
              <h1 className="font-heading text-4xl font-extrabold text-foreground md:text-5xl lg:text-6xl drop-shadow-lg text-white">
                {movie.title}
                {movie.year && <span className="ml-4 text-3xl font-light text-white/70">({movie.year})</span>}
              </h1>
              {movie.tagline && <p className="text-lg text-white/80 italic font-light drop-shadow-md">"{movie.tagline}"</p>}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-white/80">
              {movie.runtime && (
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  <Clock className="h-4 w-4 text-accent" />
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              {movie.release_date && (
                <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  <Calendar className="h-4 w-4 text-accent" />
                  {movie.release_date}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {movie.genres?.map((genre) => (
                <span key={genre} className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black cursor-default">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content Section below */}
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-10">
            <div className="animate-fade-in-up">
              <h3 className="mb-4 font-heading text-2xl font-semibold text-text-primary flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" /> Concept & Story
              </h3>
              <p className="text-lg leading-relaxed text-text-secondary font-light">
                {movie.overview}
              </p>
            </div>

        {movie.cast && movie.cast.length > 0 && (
          <section className="premium-card mt-8 rounded-2xl p-6">
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-text-primary">
              <Sparkles className="h-4 w-4 text-accent" /> Top Cast
            </h3>
            <div className="scroll-row">
              {movie.cast.map((actor) => (
                <div key={actor.name} className="w-[110px] flex-shrink-0 text-center">
                  <div className="relative mx-auto mb-2.5 h-[90px] w-[90px] overflow-hidden rounded-full bg-bg-elevated ring-2 ring-border">
                    {actor.profile_url ? (
                      <Image src={actor.profile_url} alt={actor.name} fill className="object-cover" sizes="90px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-text-muted">{actor.name[0]}</div>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold text-text-primary">{actor.name}</p>
                  <p className="truncate text-xs text-text-muted">{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {movie.trailer_key && (
          <section className="mt-8 space-y-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-text-primary">
              <Sparkles className="h-4 w-4 text-accent" /> Trailer
            </h3>
            <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-card">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailer_key}`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </section>
        )}

        {movie.platforms && movie.platforms.length > 0 && (
          <section className="mt-8 space-y-4">
            <h3 className="flex items-center gap-2 text-base font-bold text-text-primary">
              <Sparkles className="h-4 w-4 text-accent" /> Where to Watch
            </h3>
            <div className="flex flex-wrap gap-2">
              {movie.platforms.map((platform) => <span key={platform} className="platform-badge">{platform}</span>)}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <div className="mt-12">
            <MovieRow title="More Like This" movies={recommendations} />
          </div>
        )}
        {movie.similar && movie.similar.length > 0 && (
          <div className="mt-8">
            <MovieRow title="Similar Films" movies={movie.similar} />
          </div>
        )}
      </div>
    </main>
  );
}
