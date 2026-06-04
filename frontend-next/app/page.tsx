import {
  ArrowRight,
  Globe,
  Star,
  TrendingUp,
  Layers,
  Film,
  Compass,
  Sparkles,
} from "lucide-react";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import MovieRow from "../components/MovieRow";
import RowSkeleton from "../components/RowSkeleton";
import PersonalizedRecommendations from "../components/recommendation/PersonalizedRecommendations";
import Hero from "../components/Hero";
import MoodPickerStrip from "../components/recommendation/MoodPickerStrip";
import {
  getAnime,
  getByRegion,
  getMlOverview,
  getTrendingAll,
  getTopRated
} from "../lib/api";

import CinemaWorldMapWrapper from "../components/CinemaWorldMapWrapper";

export const revalidate = 300;

export default async function HomePage() {
  // Fetch ALL rows in parallel
  const [
    trending,
    bollywood,
    korean,
    japanese,
    anime,
    topRated,
    mlOverview,
    french,
    hollywood,
    tamil
  ] = await Promise.all([
    getTrendingAll(),
    getByRegion("bollywood"),
    getByRegion("korean"),
    getByRegion("japanese"),
    getAnime(),
    getTopRated(),
    getMlOverview(),
    getByRegion("french"),
    getByRegion("hollywood"),
    getByRegion("tamil"),
  ]);

  const featuredMovie = (trending?.[0] || {
    title: "Discover Global Cinema",
    year: 2024,
    rating: 9.1,
    genres: ["Sci-Fi", "Drama"],
    director: "NeuralFlix",
    poster_url: null,
  }) as any;

  const sideMovies = [
    (trending?.[1] || {
      title: "World Cinema",
      region: "Global",
      poster_url: null,
    }) as any,
    (trending?.[2] || {
      title: "Hidden Gems",
      region: "Worldwide",
      poster_url: null,
    }) as any,
  ];

  const catalogSize = mlOverview?.catalog_size || 930000;

  // Region configuration for Bento Grid mapping
  const REGION_CARDS = [
    { key: "hollywood", name: "Hollywood", movies: hollywood, desc: "Blockbusters & auteur cinema", accent: "from-amber-600/20 to-yellow-600/10", border: "border-yellow-500/20" },
    { key: "bollywood", name: "Bollywood", movies: bollywood, desc: "Hindi epics, dramas & musicals", accent: "from-orange-600/20 to-red-600/10", border: "border-orange-500/20" },
    { key: "korean", name: "Korean Cinema", movies: korean, desc: "Tense thrillers & class dramas", accent: "from-blue-600/20 to-indigo-600/10", border: "border-blue-500/20" },
    { key: "japanese", name: "Japanese Cinema", movies: japanese, desc: "Classic masterpieces & anime roots", accent: "from-red-600/20 to-rose-600/10", border: "border-red-500/20" },
    { key: "french", name: "French Cinema", movies: french, desc: "Auteur art-house & romantic realism", accent: "from-purple-600/20 to-indigo-600/10", border: "border-purple-500/20" },
    { key: "tamil", name: "Tamil Cinema", movies: tamil, desc: "Mass spectacles & high-octane drama", accent: "from-teal-600/20 to-emerald-600/10", border: "border-teal-500/20" },
  ];

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden page-enter">
      {/* ── Hero Section (Full Viewport, 50% backdrop) ── */}
      <Hero featuredMovie={featuredMovie} sideMovies={sideMovies} catalogSize={catalogSize} />

      {/* ── Main Content ── */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 py-20 space-y-24">
        {/* Personalized "For You" */}
        <section className="space-y-8">
          <div className="rounded-2xl p-6 md:p-8 border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 backdrop-blur-sm">
            <PersonalizedRecommendations />
          </div>
        </section>

        {/* Trending Now */}
        <Suspense fallback={<RowSkeleton label="Trending Now" />}>
          <MovieRow title="Trending Now" movies={trending} seeAllHref="/discover?sort=popularity" />
        </Suspense>

        {/* Regional Bento Grid */}
        <section className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent-warm)] mb-2">
              <Compass className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">World Cinema Matrix</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Regional Bento Grid</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Exceptional cinema clusters mapped by origin and language family.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGION_CARDS.map((r) => {
              const topMovie = r.movies?.[0];
              return (
                <a
                  key={r.key}
                  href={`/cinema/${r.key}`}
                  className={`group relative rounded-2xl border ${r.border} bg-gradient-to-br ${r.accent} p-6 overflow-hidden flex flex-col justify-between h-[240px] hover:border-white/20 transition-all hover:scale-[1.01] shadow-md`}
                >
                  {topMovie?.backdrop_url && (
                    <img
                      src={topMovie.backdrop_url}
                      alt={r.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-10 group-hover:opacity-20 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-elevated)] via-[var(--surface-elevated)]/60 to-transparent" />
                  
                  <div className="relative z-10">
                    <span className="text-[10px] font-bold text-[var(--accent-warm)] uppercase tracking-wider">{r.name}</span>
                    <h3 className="text-xl font-bold text-white mt-1 group-hover:text-[var(--accent-warm)] transition-colors">{r.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{r.desc}</p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    {topMovie && (
                      <span className="text-[10px] text-white/40 truncate max-w-[70%]">
                        Featured: <strong className="text-white/70">{topMovie.title}</strong>
                      </span>
                    )}
                    <span className="text-xs font-bold text-[var(--accent-warm)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Explore →
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Top Rated */}
        <Suspense fallback={<RowSkeleton label="Top Rated" />}>
          <MovieRow title="Top Rated" movies={topRated} seeAllHref="/discover?sort=rating" />
        </Suspense>

        {/* Anime Spotlight */}
        <Suspense fallback={<RowSkeleton label="Anime Spotlight" />}>
          <MovieRow title="Anime Spotlight" movies={anime} seeAllHref="/discover?genres=Animation" />
        </Suspense>

        {/* Mood Picker Strip */}
        <MoodPickerStrip />

        {/* Cinema World Map Preview */}
        <section className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent-warm)] mb-2">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Spatial Embeddings</span>
            </div>
            <h2 className="text-3xl font-bold text-white">Cinema Globe</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Holographic coordinate projection of international film networks.</p>
          </div>
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 p-4 md:p-6 backdrop-blur-md relative overflow-hidden">
            <CinemaWorldMapWrapper />
          </div>
        </section>
      </div>
    </main>
  );
}
