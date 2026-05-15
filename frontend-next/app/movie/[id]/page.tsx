"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Film,
  Globe,
  Heart,
  Play,
  Plus,
  Share2,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import MovieRow from "../../../components/MovieRow";
import MultiRatingPanel from "../../../components/movie/MultiRatingPanel";
import StreamingPanel from "../../../components/movie/StreamingPanel";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CastMember {
  name: string;
  character: string;
  profile_url?: string;
}

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
  language?: string;
  genres: string[];
  poster_url?: string;
  backdrop_url?: string;
  director?: string;
  cast?: CastMember[];
  trailer_key?: string;
  platforms?: string[];
  similar?: any[];
  imdb_id?: string;
  media_type?: string;
  deep_metadata?: {
    box_office?: any;
    trivia?: any;
    awards?: any;
    parents_guide?: any;
  };
}

export default function MovieDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get("type") || "movie";
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "cast" | "details">(
    "overview"
  );

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
          <p className="text-sm font-semibold text-text-muted">
            Loading film data...
          </p>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Film className="h-16 w-16 text-text-muted/30" />
        <p className="text-lg font-semibold text-text-secondary">
          Movie not found
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background page-enter">
      {/* Hero Backdrop */}
      <div className="relative h-[50vh] w-full overflow-hidden">
        {movie.backdrop_url && (
          <Image
            src={movie.backdrop_url}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
        )}
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        {/* Back button */}
        <div className="absolute left-6 top-24 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 -mt-48 md:px-6">
        <div className="flex flex-col gap-10 md:flex-row">
          {/* Poster */}
          <div className="w-64 shrink-0">
            <div className="overflow-hidden rounded-2xl border border-border shadow-2xl">
              {movie.poster_url && (
                <Image
                  src={movie.poster_url}
                  alt={movie.title}
                  width={256}
                  height={384}
                  className="w-full"
                />
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface py-3 text-text-muted transition-all hover:border-accent hover:text-accent">
                <Plus className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase">
                  Watchlist
                </span>
              </button>
              <button className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface py-3 text-text-muted transition-all hover:border-[#E50914] hover:text-[#E50914]">
                <Heart className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase">
                  Favorite
                </span>
              </button>
              <button className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface py-3 text-text-muted transition-all hover:border-accent hover:text-accent">
                <Share2 className="h-5 w-5" />
                <span className="text-[9px] font-bold uppercase">Share</span>
              </button>
            </div>
          </div>

          {/* Info Panel */}
          <div className="flex-1 pt-8">
            {/* Title & Meta */}
            <h1 className="text-4xl font-black tracking-tight text-text-primary md:text-5xl">
              {movie.title}
            </h1>

            {movie.tagline && (
              <p className="mt-2 text-lg italic text-text-muted">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta Chips */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {movie.year && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary">
                  <Calendar className="h-3.5 w-3.5" />
                  {movie.year}
                </span>
              )}
              {movie.runtime && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary">
                  <Clock className="h-3.5 w-3.5" />
                  {movie.runtime} min
                </span>
              )}
              {movie.language && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary">
                  <Globe className="h-3.5 w-3.5" />
                  {movie.language.toUpperCase()}
                </span>
              )}
              {movie.director && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-secondary">
                  <Film className="h-3.5 w-3.5" />
                  {movie.director}
                </span>
              )}
            </div>

            {/* Genre Pills */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <span key={genre} className="genre-pill">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* ─── Multi-Source Ratings ──────────────────────────── */}
            <div className="mt-8">
              <MultiRatingPanel
                tmdbId={movie.tmdb_id}
                imdbId={movie.imdb_id}
                mediaType={type}
              />
            </div>

            {/* Content Tabs */}
            <div className="mt-8 border-b border-border">
              <div className="flex gap-6">
                {(
                  [
                    { key: "overview", label: "Overview" },
                    { key: "cast", label: "Cast & Crew" },
                    { key: "details", label: "Details" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`border-b-2 pb-3 text-sm font-bold transition-all ${
                      activeTab === tab.key
                        ? "border-accent text-accent"
                        : "border-transparent text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <p className="max-w-2xl text-base leading-relaxed text-text-secondary">
                    {movie.overview}
                  </p>

                  {/* Streaming Panel */}
                  <StreamingPanel
                    tmdbId={movie.tmdb_id}
                    imdbId={movie.imdb_id}
                    mediaType={type}
                  />
                </div>
              )}

              {activeTab === "cast" && movie.cast && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {movie.cast.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-all hover:shadow-md"
                    >
                      {member.profile_url ? (
                        <Image
                          src={member.profile_url}
                          alt={member.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-elevated">
                          <User className="h-5 w-5 text-text-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text-primary">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          as {member.character}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "details" && (
                <div className="space-y-6">
                  {/* Deep Metadata from IMDb */}
                  {movie.deep_metadata?.awards && (
                    <div className="premium-card rounded-2xl p-6">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-accent">
                        <Sparkles className="h-4 w-4" />
                        Awards & Nominations
                      </h3>
                      <div className="text-sm text-text-secondary">
                        {typeof movie.deep_metadata.awards === "object"
                          ? JSON.stringify(movie.deep_metadata.awards)
                          : String(movie.deep_metadata.awards)}
                      </div>
                    </div>
                  )}

                  {movie.deep_metadata?.box_office && (
                    <div className="premium-card rounded-2xl p-6">
                      <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-accent">
                        Box Office Performance
                      </h3>
                      <div className="text-sm text-text-secondary">
                        {typeof movie.deep_metadata.box_office === "object"
                          ? JSON.stringify(movie.deep_metadata.box_office)
                          : String(movie.deep_metadata.box_office)}
                      </div>
                    </div>
                  )}

                  {movie.deep_metadata?.trivia && (
                    <div className="premium-card rounded-2xl p-6">
                      <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-accent">
                        Did You Know?
                      </h3>
                      <div className="text-sm text-text-secondary">
                        {Array.isArray(movie.deep_metadata.trivia)
                          ? movie.deep_metadata.trivia
                              .slice(0, 5)
                              .map((t: any, i: number) => (
                                <p key={i} className="mb-2">
                                  • {typeof t === "string" ? t : JSON.stringify(t)}
                                </p>
                              ))
                          : typeof movie.deep_metadata.trivia === "object"
                          ? JSON.stringify(movie.deep_metadata.trivia)
                          : String(movie.deep_metadata.trivia)}
                      </div>
                    </div>
                  )}

                  {!movie.deep_metadata && (
                    <p className="text-sm text-text-muted">
                      Detailed metadata not available for this title.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Similar Movies / Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-20 mb-16">
            <MovieRow title="More Like This" movies={recommendations} />
          </div>
        )}

        {movie.similar && movie.similar.length > 0 && (
          <div className="mt-10 mb-16">
            <MovieRow title="Similar Films" movies={movie.similar} />
          </div>
        )}
      </div>
    </main>
  );
}
