"use client";

import { useState, useEffect } from "react";
import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";

const API = "http://localhost:8000";

export default function HomePage() {
  const [heroMovies, setHeroMovies] = useState([]);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [indian, setIndian] = useState([]);
  const [korean, setKorean] = useState([]);
  const [international, setInternational] = useState([]);
  const [anime, setAnime] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const endpoints = [
          { key: "nowplaying", set: setNowPlaying, hero: true },
          { key: "trending", set: setTrending },
          { key: "toprated", set: setTopRated },
          { key: "indian", set: setIndian },
          { key: "korean", set: setKorean },
          { key: "international", set: setInternational },
          { key: "anime", set: setAnime },
          { key: "series", set: setSeries },
        ];

        const results = await Promise.allSettled(
          endpoints.map((ep) =>
            fetch(`${API}/api/movies/${ep.key}`).then((r) => r.json())
          )
        );

        results.forEach((result, i) => {
          if (result.status === "fulfilled") {
            const movies = result.value.results || [];
            endpoints[i].set(movies);
            if (endpoints[i].hero) {
              setHeroMovies(movies);
            }
          }
        });
      } catch (err) {
        console.error("Failed to fetch movies:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-imdb-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-muted text-sm">Loading movies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Hero Carousel */}
      <HeroCarousel movies={heroMovies} />

      {/* Movie Rows */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <MovieRow title="Trending Now" movies={trending} />
        <MovieRow title="Top Rated" movies={topRated} />
        <MovieRow title="Now Playing" movies={nowPlaying} />
        <MovieRow title="Indian Cinema" movies={indian} />
        <MovieRow title="Korean Sensations" movies={korean} />
        <MovieRow title="International Cinema" movies={international} />
        <MovieRow title="Anime & Animation" movies={anime} />
        <MovieRow title="TV Series" movies={series} />
      </div>
    </div>
  );
}
