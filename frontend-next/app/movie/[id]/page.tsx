"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MovieRow from "../../../components/MovieRow";
import MultiRatingPanel from "../../../components/movie/MultiRatingPanel";
import StreamingPanel from "../../../components/movie/StreamingPanel";
import Loading from "./loading";
import { getUser, authFetch, isAuthenticated } from "../../../lib/auth";


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
  const router = useRouter();
  const id = params.id as string;
  const type = searchParams.get("type") || "movie";

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "trailer" | "cast" | "info">("overview");
  const [watchlistActive, setWatchlistActive] = useState(false);
  const [favoriteActive, setFavoriteActive] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [scrollY, setScrollY] = useState(0);

  // Parallax Scroll fade listener
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleWatchlist = async () => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    const user = getUser();
    const nextState = !watchlistActive;
    setWatchlistActive(nextState);
    try {
      const res = await authFetch(
        `${API}/api/v1/users/${user!.id}/watchlist/${movie?.tmdb_id || id}`,
        { method: nextState ? "POST" : "DELETE" }
      );
      if (!res.ok) setWatchlistActive(!nextState);
    } catch (err) {
      console.error(err);
      setWatchlistActive(!nextState);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    const user = getUser();
    const nextState = !favoriteActive;
    setFavoriteActive(nextState);
    try {
      const res = await authFetch(
        `${API}/api/v1/users/${user!.id}/favorites/${movie?.tmdb_id || id}`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setFavoriteActive(data.status === "added");
      } else {
        setFavoriteActive(!nextState);
      }
    } catch (err) {
      console.error(err);
      setFavoriteActive(!nextState);
    }
  };

  const handleRate = async (rating: number) => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    const user = getUser();
    setUserRating(rating);
    try {
      await authFetch(
        `${API}/api/v1/users/${user!.id}/rate/${movie?.tmdb_id || id}?rating=${rating}`,
        { method: "POST" }
      );
    } catch (err) {
      console.error(err);
    }
  };

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
        setMovie(!movieRes.ok || movieData?.error || movieData?.detail ? null : movieData);
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecommendations(recData.recommendations || []);
        }

        const user = getUser();
        if (user?.id) {
          const [watchlistRes, favoritesRes, ratingsRes] = await Promise.all([
            authFetch(`${API}/api/v1/users/${user.id}/watchlist?limit=100`),
            authFetch(`${API}/api/v1/users/${user.id}/favorites`),
            authFetch(`${API}/api/v1/users/${user.id}/ratings`),
          ]);
          if (watchlistRes.ok) {
            const watchlistData = await watchlistRes.json();
            const results = watchlistData.results || [];
            const inWatchlist = results.some((m: any) => String(m.tmdb_id) === String(movieData?.tmdb_id || id));
            setWatchlistActive(inWatchlist);
          }
          if (favoritesRes.ok) {
            const favoritesData = await favoritesRes.json();
            const results = favoritesData.results || [];
            const inFavorites = results.some((m: any) => String(m.tmdb_id) === String(movieData?.tmdb_id || id));
            setFavoriteActive(inFavorites);
          }
          if (ratingsRes.ok) {
            const ratingsData = await ratingsRes.json();
            const ratingValue = ratingsData.ratings?.[String(movieData?.tmdb_id || id)] || 0;
            setUserRating(ratingValue);
          }
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
    return <Loading />;
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-primary)] px-6">
        <Film className="h-14 w-14 text-[var(--text-tertiary)] mb-4" />
        <h2 className="text-2xl font-bold text-white font-playfair">Film Not Mapped</h2>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-warm)] px-6 py-3 text-sm font-semibold text-black transition-all hover:brightness-110">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  const langName = LANG_NAMES[movie.language || "en"] || movie.language?.toUpperCase() || "Unknown";
  const matchScore = Math.min(99, Math.max(70, Math.round((movie.rating || 7.0) * 10 + 5)));

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] pb-24 page-enter">
      {/* Cinematic Backdrop (60vh) with parallax scroll fade */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        {movie.backdrop_url ? (
          <div 
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollY * 0.4}px)`, opacity: Math.max(0.1, 1 - scrollY / 400) }}
          >
            <Image
              src={movie.backdrop_url}
              alt={movie.title}
              fill
              className="object-cover opacity-50 brightness-75"
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--surface-primary)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-primary)]/80 via-transparent to-transparent z-10" />

        {/* Back Button with Glass Effect */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-5 sm:left-8 md:left-12 top-24 z-20"
        >
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/15 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--accent-warm)]" />
            Back
          </button>
        </motion.div>
      </div>

      {/* Content Layout */}
      <div className="relative z-20 mx-auto max-w-7xl px-5 sm:px-8 md:px-12 -mt-48 md:-mt-64">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left Column (Poster + Widgets) */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1 shadow-2xl transition-all duration-300"
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

            {/* ML Match Score Badge */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-center animate-pulse-glow">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold mb-1">
                Neural Match Score
              </p>
              <p className="text-3xl font-black text-[var(--accent-warm)]">{matchScore}%</p>
            </div>

            {/* Action CTAs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleWatchlist}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-xs transition-all cursor-pointer ${
                  watchlistActive
                    ? "border-[var(--accent-warm)]/30 bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]"
                    : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Watchlist</span>
              </button>
              <button
                onClick={handleFavorite}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 text-xs transition-all cursor-pointer ${
                  favoriteActive
                    ? "border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10 text-[var(--accent-rose)]"
                    : "border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <Heart className={`h-4 w-4 ${favoriteActive ? "fill-current" : ""}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Favorite</span>
              </button>
            </div>

            {/* 10-star rating widget */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/60 p-4 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold mb-3 text-center">
                Your Rating
              </p>
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const starVal = i + 1;
                  const active = starVal <= (hoverRating || userRating);
                  return (
                    <button
                      key={starVal}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRate(starVal)}
                      className="cursor-pointer transition-transform hover:scale-125"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          active ? "text-[var(--rating-gold)] fill-[var(--rating-gold)]" : "text-white/20"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              {userRating > 0 && (
                <p className="text-[10px] font-mono text-[var(--rating-gold)] text-center mt-2.5 font-bold">
                  RATED: {userRating}/10
                </p>
              )}
            </div>

            {/* Share Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Movie link copied to clipboard!");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 py-3 text-xs font-bold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              <Share2 className="h-4 w-4 text-[var(--accent-warm)]" />
              Share Link
            </button>
          </div>

          {/* Right Column (Title + Meta + Tabs) */}
          <div className="flex-1 pt-4 lg:pt-12 space-y-6">
            {/* Title / Tagline */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight font-playfair">
                {movie.title}
              </h1>
              {movie.tagline && (
                <p className="text-lg italic text-[var(--text-secondary)] mt-2">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* Meta badges strip */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] font-medium">
              {movie.year && (
                <span className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                  {movie.year}
                </span>
              )}
              {movie.runtime && (
                <span className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1 font-mono">
                  <Clock className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                  {movie.runtime} min
                </span>
              )}
              {movie.language && (
                <span className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1 uppercase tracking-wider font-mono">
                  <Globe className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                  {langName}
                </span>
              )}
              {movie.director && (
                <span className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1 truncate max-w-[200px]">
                  <Film className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                  {movie.director}
                </span>
              )}
            </div>

            {/* Genre Pills */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <span key={g} className="bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-[var(--accent-warm)]/20">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Multi-Source Ratings */}
            <MultiRatingPanel tmdbId={movie.tmdb_id} imdbId={movie.imdb_id} mediaType={type} />

            {/* Tabs Controller */}
            <div className="border-b border-[var(--border-subtle)] flex gap-6">
              {([
                { key: "overview", label: "Overview" },
                { key: "trailer", label: "Official Trailer" },
                { key: "cast", label: "Cast" },
                { key: "info", label: "Extended Info" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative pb-3 text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? "text-[var(--accent-warm)] font-extrabold"
                      : "text-[var(--text-tertiary)] hover:text-white"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activeTabDetails"
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--accent-warm)] rounded-full shadow-[0_0_8px_var(--accent-warm-glow)]"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tabs View Content */}
            <div className="min-h-[220px]">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Synopsis</h3>
                      <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                        {movie.overview || "No synopsis available for this film."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Where to Watch</h3>
                      <StreamingPanel tmdbId={movie.tmdb_id} imdbId={movie.imdb_id} mediaType={type} />
                    </div>
                  </motion.div>
                )}

                {activeTab === "trailer" && (
                  <motion.div
                    key="trailer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    {movie.trailer_key ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border-default)] bg-black shadow-inner">
                        <iframe
                          src={`https://www.youtube.com/embed/${movie.trailer_key}?rel=0&modestbranding=1&color=white`}
                          title={`${movie.title} — Official Trailer`}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                          allowFullScreen
                          loading="lazy"
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-8 text-center backdrop-blur-sm">
                        <Film className="h-10 w-10 mx-auto text-white/20 mb-2" />
                        <p className="text-sm text-[var(--text-tertiary)] font-sans">Official video trailer not found in our indices.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "cast" && movie.cast && (
                  <motion.div
                    key="cast"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid gap-3 grid-cols-2 md:grid-cols-3"
                  >
                    {movie.cast.map((member, i) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 hover:border-white/20 transition-all duration-200"
                      >
                        {member.profile_url ? (
                          <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black">
                            <Image src={member.profile_url} alt={member.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 border border-white/5 flex-shrink-0">
                            <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">{member.name}</p>
                          <p className="truncate text-xs text-[var(--text-tertiary)] mt-0.5">as {member.character}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === "info" && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Awards Entry Mapping */}
                    {movie.deep_metadata?.awards && (
                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Awards & Honors</h3>
                        <div className="space-y-2">
                          {typeof movie.deep_metadata.awards === "string" ? (
                            <p className="text-sm text-[var(--text-secondary)]">{movie.deep_metadata.awards}</p>
                          ) : (
                            Object.entries(movie.deep_metadata.awards as Record<string, string>).map(([k, v]) => (
                              <div key={k} className="flex items-start gap-3 text-sm border-b border-white/5 pb-2 last:border-none last:pb-0">
                                <span className="text-[var(--accent-gold)] font-bold w-32 shrink-0">{k.replace(/_/g, " ").toUpperCase()}</span>
                                <span className="text-[var(--text-secondary)]">{String(v)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Box Office */}
                    {movie.deep_metadata?.box_office && (
                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Box Office Earnings</h3>
                        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {typeof movie.deep_metadata.box_office === "string" ? (
                            <p>{movie.deep_metadata.box_office}</p>
                          ) : (
                            Object.entries(movie.deep_metadata.box_office as Record<string, string>).map(([k, v]) => (
                              <div key={k} className="flex items-start gap-3 text-sm">
                                <span className="text-[var(--accent-warm)] font-bold w-32 shrink-0">{k.replace(/_/g, " ").toUpperCase()}</span>
                                <span className="text-[var(--text-secondary)]">{String(v)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trivia */}
                    {movie.deep_metadata?.trivia && (
                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Trivia & Facts</h3>
                        <div className="space-y-3">
                          {Array.isArray(movie.deep_metadata.trivia) ? (
                            movie.deep_metadata.trivia.slice(0, 5).map((t, idx) => (
                              <p key={idx} className="pl-4 border-l-2 border-[var(--accent-warm)] text-sm text-[var(--text-secondary)] leading-relaxed">
                                {typeof t === "string" ? t : JSON.stringify(t)}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-[var(--text-secondary)]">{String(movie.deep_metadata.trivia)}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!movie.deep_metadata?.awards && !movie.deep_metadata?.box_office && !movie.deep_metadata?.trivia && (
                      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-8 text-center backdrop-blur-sm">
                        <p className="text-sm text-[var(--text-tertiary)]">No extended trivia or box office sheets mapped.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Similar Movies */}
        {recommendations.length > 0 && (
          <div className="mt-16">
            <MovieRow title="Similar Films" movies={recommendations} />
          </div>
        )}

        {/* You May Also Like */}
        {movie.similar && movie.similar.length > 0 && (
          <div className="mt-12">
            <MovieRow title="You May Also Like" movies={movie.similar} />
          </div>
        )}
      </div>
    </main>
  );
}
