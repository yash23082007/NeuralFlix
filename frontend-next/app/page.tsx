import { api } from "../lib/api";
import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";
import { MoodSelector } from "../components/recommendation/MoodSelector";
import { Suspense } from "react";

async function MovieContent() {
  // Parallel data fetching on the server using the pinned API client
  const [
    trending,
    topRated,
    nowPlaying,
    indian,
    korean,
    international,
    anime,
    series
  ] = await Promise.all([
    api.movies.getTrending().catch(() => ({ results: [] })),
    api.movies.getTopRated().catch(() => ({ results: [] })),
    api.movies.getNowPlaying().catch(() => ({ results: [] })),
    api.movies.getIndian().catch(() => ({ results: [] })),
    api.movies.getKorean().catch(() => ({ results: [] })),
    api.movies.getInternational().catch(() => ({ results: [] })),
    api.movies.getAnime().catch(() => ({ results: [] })),
    api.movies.getSeries().catch(() => ({ results: [] })),
  ]);

  return (
    <div className="space-y-0">
      {/* Hero Carousel - Using Now Playing as initial hero data */}
      <HeroCarousel movies={nowPlaying.results} />

      {/* Movie Rows using server-fetched data */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <div className="py-4"><MoodSelector /></div>
        <MovieRow title="Trending Now" movies={trending.results} />
        <MovieRow title="Top Rated" movies={topRated.results} />
        <MovieRow title="Now Playing" movies={nowPlaying.results} />
        <MovieRow title="Indian Cinema" movies={indian.results} />
        <MovieRow title="Korean Sensations" movies={korean.results} />
        <MovieRow title="International Cinema" movies={international.results} />
        <MovieRow title="Anime & Animation" movies={anime.results} />
        <MovieRow title="TV Series" movies={series.results} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="space-y-4 text-center">
            <div className="w-10 h-10 border-2 border-imdb-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-muted text-sm font-semibold tracking-wide uppercase">NeuralFlix Engine Warming Up...</p>
          </div>
        </div>
      }
    >
      <MovieContent />
    </Suspense>
  );
}

