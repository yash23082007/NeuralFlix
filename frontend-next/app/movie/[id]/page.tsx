"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, Calendar, Play, ExternalLink, ChevronLeft } from "lucide-react";
import MovieRow from "../../../components/MovieRow";

const API = "http://localhost:8000";

interface MovieDetail {
  tmdb_id: number;
  title: string;
  overview: string;
  tagline: string;
  rating: number;
  votes: number;
  year: number;
  release_date: string;
  runtime: number;
  genres: string[];
  poster_url: string;
  backdrop_url: string;
  director: string;
  cast: { name: string; character: string; profile_url: string }[];
  trailer_key: string;
  platforms: string[];
  similar: any[];
  imdb_id: string;
  omdb_rating: string;
  rt_rating: string;
  metacritic: number;
  box_office: string;
  awards: string;
  media_type: string;
}

export default function MovieDetailPage({ params, searchParams }: { params: any, searchParams: any }) {
  const id = params.id as string;
  const type = searchParams.type || 'movie';
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchMovie() {
      try {
        const res = await fetch(`${API}/api/movies/${id}?media_type=${type}`);
        const data = await res.json();
        setMovie(data);

        // Fetch ML recommendations
        const recRes = await fetch(`${API}/api/recommendations/${id}?media_type=${type}`);
        const recData = await recRes.json();
        setRecommendations(recData.recommendations || []);
      } catch (err) {
        console.error("Failed to fetch movie:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-imdb-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!movie || movie.title === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">Movie not found.</p>
        <Link href="/" className="text-imdb-gold hover:underline text-sm">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Backdrop Hero */}
      <section className="relative h-[40vh] md:h-[55vh] overflow-hidden">
        <div className="absolute inset-0">
          {movie.backdrop_url && (
            <Image
              src={movie.backdrop_url}
              alt={movie.title}
              fill
              className="object-cover object-top"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        {/* Back Button */}
        <Link
          href="/"
          className="absolute top-4 left-4 z-20 flex items-center gap-1 px-3 py-1.5 bg-black/50 hover:bg-black/70 text-white text-sm rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="relative w-[200px] md:w-[250px] aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-border">
              <Image
                src={movie.poster_url || "/placeholder.jpg"}
                alt={movie.title}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-5 pt-4 md:pt-12">
            {/* Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                {movie.title}
                {movie.year && (
                  <span className="text-text-muted font-normal ml-3 text-2xl">
                    ({movie.year})
                  </span>
                )}
              </h1>
              {movie.tagline && (
                <p className="text-text-muted italic mt-1">{movie.tagline}</p>
              )}
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              {movie.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              {movie.release_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {movie.release_date}
                </span>
              )}
              {movie.director && (
                <span>
                  Director: <strong className="text-white">{movie.director}</strong>
                </span>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((g) => (
                <span key={g} className="genre-pill">{g}</span>
              ))}
            </div>

            {/* Ratings Bar */}
            <div className="flex flex-wrap items-center gap-4">
              {/* IMDb Rating */}
              {(movie.omdb_rating || movie.rating > 0) && (
                <div className="flex items-center gap-2">
                  <div className="bg-imdb-gold text-black font-black text-xs px-1.5 py-0.5 rounded">
                    IMDb
                  </div>
                  <span className="text-white font-bold text-lg">
                    {movie.omdb_rating || movie.rating?.toFixed(1)}
                  </span>
                  <span className="text-text-muted text-sm">
                    /10
                    {movie.votes && (
                      <> · {(movie.votes / 1000).toFixed(0)}K</>
                    )}
                  </span>
                </div>
              )}

              {/* Rotten Tomatoes */}
              {movie.rt_rating && (
                <div className="flex items-center gap-2">
                  <div className="bg-rt-red text-white font-black text-xs px-1.5 py-0.5 rounded">
                    RT
                  </div>
                  <span className="text-white font-bold">{movie.rt_rating}%</span>
                </div>
              )}

              {/* Metacritic */}
              {movie.metacritic && (
                <div className="flex items-center gap-2">
                  <div className={`text-white font-black text-xs px-1.5 py-0.5 rounded ${
                    movie.metacritic >= 60 ? "bg-mc-green" : movie.metacritic >= 40 ? "bg-yellow-500" : "bg-red-500"
                  }`}>
                    MC
                  </div>
                  <span className="text-white font-bold">{movie.metacritic}</span>
                </div>
              )}
            </div>

            {/* Overview */}
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                Overview
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {movie.overview}
              </p>
            </div>

            {/* Awards & Box Office */}
            <div className="flex flex-wrap gap-6 text-sm">
              {movie.awards && movie.awards !== "N/A" && (
                <div>
                  <span className="text-text-muted">Awards: </span>
                  <span className="text-imdb-gold font-medium">{movie.awards}</span>
                </div>
              )}
              {movie.box_office && movie.box_office !== "N/A" && (
                <div>
                  <span className="text-text-muted">Box Office: </span>
                  <span className="text-white font-medium">{movie.box_office}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cast Section */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="mt-12 space-y-4">
            <h3 className="section-heading">Top Cast</h3>
            <div className="scroll-row">
              {movie.cast.map((actor) => (
                <div key={actor.name} className="flex-shrink-0 w-[120px] text-center">
                  <div className="relative w-[100px] h-[100px] mx-auto rounded-full overflow-hidden bg-surface-light mb-2">
                    {actor.profile_url ? (
                      <Image
                        src={actor.profile_url}
                        alt={actor.name}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-2xl font-bold">
                        {actor.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{actor.name}</p>
                  <p className="text-xs text-text-muted truncate">{actor.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trailer */}
        {movie.trailer_key && (
          <section className="mt-12 space-y-4">
            <h3 className="section-heading">Trailer</h3>
            <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailer_key}`}
                title={`${movie.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </section>
        )}

        {/* Where to Watch */}
        {movie.platforms && movie.platforms.length > 0 && (
          <section className="mt-12 space-y-4">
            <h3 className="section-heading">Where to Watch</h3>
            <div className="flex flex-wrap gap-3">
              {movie.platforms.map((platform) => (
                <span key={platform} className="platform-badge">
                  {platform}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ML Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-12 pb-12">
            <MovieRow title="More Like This" movies={recommendations} />
          </div>
        )}

        {/* Similar Movies from TMDB */}
        {movie.similar && movie.similar.length > 0 && (
          <div className="pb-12">
            <MovieRow title="Similar Movies" movies={movie.similar} />
          </div>
        )}
      </div>
    </div>
  );
}
