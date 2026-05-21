"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  Clock,
  Film,
  Globe,
  Heart,
  Play,
  Plus,
  Share2,
  Star,
  Tv,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", ko: "Korean", ja: "Japanese", fr: "French",
  es: "Spanish", de: "German", ta: "Tamil", te: "Telugu", zh: "Chinese",
  it: "Italian", pt: "Portuguese", ru: "Russian", ar: "Arabic", fa: "Persian",
};

export default function MovieDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get("type") || "movie";
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "cast" | "details">("overview");
  const [watchlistActive, setWatchlistActive] = useState(false);
  const [favoriteActive, setFavoriteActive] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function fetchMovie() {
      setLoading(true);
      try {
        const [movieRes, recRes] = await Promise.all([
          fetch(`${API}/api/v1/movies/${id}?media_type=${type}`),
          fetch(`${API}/api/v1/recommendations/${id}?media_type=${type}`),
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

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent-warm)]" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading film details...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (!movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--surface-primary)] px-6">
        <Film className="h-14 w-14 text-[var(--text-tertiary)]" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Film Not Found</h2>
        <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
          The requested film could not be found in our catalog. It may have been removed or the URL may be incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-warm)] px-6 py-3 text-sm font-semibold text-black transition-all hover:brightness-110"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  const langName = LANG_NAMES[movie.language || "en"] || movie.language?.toUpperCase() || "Unknown";
  const matchScore = Math.min(99, Math.max(70, Math.round((movie.rating || 7.0) * 10 + 5)));

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] pb-24 page-enter">
      {/* Backdrop */}
      <div className="relative h-[55vh] w-full overflow-hidden">
        {movie.backdrop_url ? (
          <Image
            src={movie.backdrop_url}
            alt={movie.title}
            fill
            className="object-cover opacity-35 brightness-75"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--surface-primary)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-primary)]/80 via-transparent to-transparent" />

        {/* Back Button */}
        <div className="absolute left-5 sm:left-8 md:left-12 top-24 z-20">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/50 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] backdrop-blur-md transition-all hover:bg-[var(--surface-hover)]"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--accent-warm)] transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 mx-auto max-w-7xl px-5 sm:px-8 md:px-12 -mt-56 md:-mt-72">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row gap-10"
        >
          {/* Poster Column */}
          <div className="w-full lg:w-72 shrink-0">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 shadow-poster"
            >
              {movie.poster_url ? (
                <Image
                  src={movie.poster_url}
                  alt={movie.title}
                  width={288}
                  height={432}
                  className="w-full rounded-xl object-cover"
                  priority
                />
              ) : (
                <div className="aspect-[2/3] bg-[var(--surface-muted)] flex items-center justify-center rounded-xl">
                  <Film className="h-12 w-12 text-[var(--text-tertiary)]" />
                </div>
              )}
            </motion.div>

            {/* Match Score */}
            <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mb-1">
                ML Match Score
              </p>
              <p className="text-3xl font-bold text-[var(--accent-warm)]">{matchScore}%</p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => setWatchlistActive(!watchlistActive)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-xs transition-all active:scale-95 ${
                  watchlistActive
                    ? "border-[var(--accent-warm)]/30 bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]"
                    : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span className="text-[10px] font-medium">Watchlist</span>
              </button>
              <button
                onClick={() => setFavoriteActive(!favoriteActive)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-xs transition-all active:scale-95 ${
                  favoriteActive
                    ? "border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10 text-[var(--accent-rose)]"
                    : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Heart className={`h-4 w-4 ${favoriteActive ? "fill-current" : ""}`} />
                <span className="text-[10px] font-medium">Favorite</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] py-3 text-xs text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] active:scale-95">
                <Share2 className="h-4 w-4" />
                <span className="text-[10px] font-medium">Share</span>
              </button>
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 pt-4 lg:pt-12">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {movie.language && (
                <span className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {langName}
                </span>
              )}
              {movie.media_type === "tv" && (
                <span className="rounded-lg border border-[var(--accent-warm)]/25 bg-[var(--accent-warm)]/10 px-3 py-1 text-xs font-medium text-[var(--accent-warm)]">
                  TV Series
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-tight tracking-tight mb-3">
              {movie.title}
            </h1>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-lg italic text-[var(--text-secondary)] mb-6">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}

            {/* Meta Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {movie.year && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Year</span>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mt-1">
                    <Calendar className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                    {movie.year}
                  </div>
                </div>
              )}
              {movie.runtime && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Runtime</span>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mt-1">
                    <Clock className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                    {movie.runtime} min
                  </div>
                </div>
              )}
              {movie.director && (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5 col-span-2 md:col-span-1">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Director</span>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold mt-1 truncate">
                    <Film className="h-3.5 w-3.5 text-[var(--accent-warm)] shrink-0" />
                    <span className="truncate">{movie.director}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {movie.genres.map((genre) => (
                  <span
                    key={genre}
                    className="genre-pill"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Multi-Source Ratings */}
            <div className="mb-8">
              <MultiRatingPanel
                tmdbId={movie.tmdb_id}
                imdbId={movie.imdb_id}
                mediaType={type}
              />
            </div>

            {/* Tabs */}
            <div className="border-b border-[var(--border-subtle)] flex gap-6 mb-8">
              {([
                { key: "overview", label: "Overview" },
                { key: "cast", label: "Cast" },
                { key: "details", label: "Details" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative pb-3 text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "text-[var(--accent-warm)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--accent-warm)] rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-8"
                >
                  {/* Synopsis */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Synopsis</h3>
                    <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                      {movie.overview || "No synopsis available for this film."}
                    </p>
                  </div>

                  {/* Rating Bar */}
                  {movie.rating > 0 && (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rating</h3>
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 fill-[var(--rating-gold)] text-[var(--rating-gold)]" />
                          <span className="text-lg font-bold text-[var(--text-primary)]">{movie.rating.toFixed(1)}</span>
                          <span className="text-sm text-[var(--text-tertiary)]">/ 10</span>
                          {movie.votes > 0 && (
                            <span className="text-xs text-[var(--text-tertiary)] ml-2">
                              ({movie.votes.toLocaleString()} votes)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-muted)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(movie.rating / 10) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-[var(--accent-warm)] to-[var(--rating-gold)]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Streaming */}
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Tv className="h-4 w-4 text-[var(--accent-warm)]" />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Where to Watch</h3>
                    </div>
                    <StreamingPanel
                      tmdbId={movie.tmdb_id}
                      imdbId={movie.imdb_id}
                      mediaType={type}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === "cast" && movie.cast && (
                <motion.div
                  key="cast"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="grid gap-3 grid-cols-2 md:grid-cols-3"
                >
                  {movie.cast.map((member, i) => (
                    <motion.div
                      key={member.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 hover:border-[var(--border-accent)] transition-all"
                    >
                      {member.profile_url ? (
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-[var(--border-subtle)] flex-shrink-0">
                          <Image src={member.profile_url} alt={member.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex-shrink-0">
                          <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{member.name}</p>
                        <p className="truncate text-xs text-[var(--text-tertiary)] mt-0.5">as {member.character}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeTab === "details" && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {movie.deep_metadata?.awards && (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Awards & Recognition</h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {typeof movie.deep_metadata.awards === "object"
                          ? JSON.stringify(movie.deep_metadata.awards)
                          : String(movie.deep_metadata.awards)}
                      </p>
                    </div>
                  )}

                  {movie.deep_metadata?.box_office && (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Box Office</h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {typeof movie.deep_metadata.box_office === "object"
                          ? JSON.stringify(movie.deep_metadata.box_office)
                          : String(movie.deep_metadata.box_office)}
                      </p>
                    </div>
                  )}

                  {movie.deep_metadata?.trivia && (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
                      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Trivia</h3>
                      <div className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
                        {Array.isArray(movie.deep_metadata.trivia)
                          ? movie.deep_metadata.trivia.slice(0, 5).map((t: any, i: number) => (
                              <p key={i} className="pl-4 border-l-2 border-[var(--accent-warm)]/25">
                                {typeof t === "string" ? t : JSON.stringify(t)}
                              </p>
                            ))
                          : typeof movie.deep_metadata.trivia === "object"
                          ? JSON.stringify(movie.deep_metadata.trivia)
                          : String(movie.deep_metadata.trivia)}
                      </div>
                    </div>
                  )}

                  {!movie.deep_metadata && (
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 text-center">
                      <p className="text-sm text-[var(--text-tertiary)]">
                        Extended details are not available for this film yet.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mt-20"
          >
            <MovieRow title="Similar Films" movies={recommendations} />
          </motion.div>
        )}

        {movie.similar && movie.similar.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mt-14"
          >
            <MovieRow title="You May Also Like" movies={movie.similar} />
          </motion.div>
        )}
      </div>
    </main>
  );
}
