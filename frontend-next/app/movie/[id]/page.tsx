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
      <section className="relative h-[45vh] overflow-hidden border-b border-border md:h-[60vh]">
        <div className="absolute inset-0">
          {movie.backdrop_url && (
            <Image src={movie.backdrop_url} alt={movie.title} fill className="object-cover object-top opacity-80 saturate-[1.08]" priority />
          )}
          <div className="hero-light-veil absolute inset-0" />
          <div className="film-grain absolute inset-0 opacity-40" />
        </div>

        <Link href="/" className="absolute left-6 top-6 z-20 inline-flex items-center gap-1.5 rounded-xl border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-text-primary shadow-card backdrop-blur-md transition-all hover:bg-white">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
      </section>

      <div className="relative z-10 mx-auto -mt-36 max-w-7xl px-4 pb-16">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="mx-auto shrink-0 md:mx-0">
            <div className="relative flex aspect-[2/3] w-[220px] items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-white shadow-2xl md:w-[280px]">
              {movie.poster_url ? (
                <Image src={movie.poster_url} alt={movie.title} fill className="object-cover" />
              ) : (
                <Film className="h-12 w-12 text-text-muted" />
              )}
            </div>
          </div>

          <div className="premium-card flex-1 space-y-6 rounded-2xl p-6 md:p-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary md:text-4xl">
                {movie.title}
                {movie.year && <span className="ml-3 text-2xl font-normal text-text-muted">({movie.year})</span>}
              </h1>
              {movie.tagline && <p className="mt-2 text-text-muted italic">{movie.tagline}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              {movie.runtime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-accent" />
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              {movie.release_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-accent" />
                  {movie.release_date}
                </span>
              )}
              {movie.director && (
                <span className="text-text-muted">
                  Directed by <span className="font-semibold text-text-primary">{movie.director}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((genre) => <span key={genre} className="genre-pill">{genre}</span>)}
            </div>

            <div className="flex flex-wrap items-center gap-5">
              {(movie.omdb_rating || movie.rating > 0) && (
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-imdb-gold px-2 py-1 text-xs font-bold text-black">IMDb</div>
                  <span className="text-lg font-bold text-text-primary">{movie.omdb_rating || movie.rating?.toFixed(1)}</span>
                  <span className="text-sm text-text-muted">/10{movie.votes ? ` / ${(movie.votes / 1000).toFixed(0)}K` : ""}</span>
                </div>
              )}
              {movie.rt_rating && (
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-rt-red px-2 py-1 text-xs font-bold text-white">RT</div>
                  <span className="font-bold text-text-primary">{movie.rt_rating}%</span>
                </div>
              )}
              {movie.metacritic && (
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg px-2 py-1 text-xs font-bold text-white ${movie.metacritic >= 60 ? "bg-mc-green" : movie.metacritic >= 40 ? "bg-yellow-500" : "bg-red-500"}`}>MC</div>
                  <span className="font-bold text-text-primary">{movie.metacritic}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-text-muted">Overview</h3>
              <p className="leading-relaxed text-text-secondary">{movie.overview}</p>
            </div>

            {((movie.awards && movie.awards !== "N/A") || (movie.box_office && movie.box_office !== "N/A")) && (
              <div className="flex flex-wrap gap-6 border-t border-border pt-2 text-sm">
                {movie.awards && movie.awards !== "N/A" && (
                  <div><span className="text-text-muted">Awards: </span><span className="font-semibold text-accent">{movie.awards}</span></div>
                )}
                {movie.box_office && movie.box_office !== "N/A" && (
                  <div><span className="text-text-muted">Box Office: </span><span className="font-semibold text-text-primary">{movie.box_office}</span></div>
                )}
              </div>
            )}
          </div>
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
