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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-text-muted">Loading film data...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-text-secondary">Movie not found</p>
        <Link href="/" className="text-accent underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="relative h-[40vh] w-full">
        {movie.backdrop_url && (
          <Image src={movie.backdrop_url} alt={movie.title} fill className="object-cover opacity-50" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-64 shrink-0 shadow-2xl rounded-xl overflow-hidden">
            {movie.poster_url && (
              <Image src={movie.poster_url} alt={movie.title} width={256} height={384} className="w-full" />
            )}
          </div>
          <div className="flex-1 text-white pt-8">
            <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
            {movie.tagline && <p className="text-xl opacity-80 mb-4 italic">"{movie.tagline}"</p>}
            <div className="flex gap-4 mb-6 opacity-70">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>{movie.runtime} min</span>}
            </div>
            <p className="text-lg leading-relaxed max-w-2xl">{movie.overview}</p>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-16">
            <MovieRow title="More Like This" movies={recommendations} />
          </div>
        )}
      </div>
    </main>
  );
}
