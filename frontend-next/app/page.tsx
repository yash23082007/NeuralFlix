import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";
import { MoodSelector } from "../components/recommendation/MoodSelector";
import CinemaWorldMap from "../components/CinemaWorldMap";
import {
  getTrending, getTopRated, getNowPlaying, getTrendingAll,
  getAnime, getByRegion, getByMood, getByGenre,
} from "../lib/api";

export const revalidate = 1800; // ISR: refresh every 30 minutes

export default async function HomePage() {
  // Parallel data fetching — all regions simultaneously
  const [
    trending, topRated, nowPlaying, trendingAll,
    indianMovies, koreanMovies, japaneseMovies, frenchMovies,
    anime, awardWinners, hiddenGems, actionMovies,
  ] = await Promise.all([
    getTrending(),
    getTopRated(),
    getNowPlaying(),
    getTrendingAll(),
    getByRegion("indian"),
    getByRegion("korean"),
    getByRegion("japanese"),
    getByRegion("french"),
    getAnime(),
    getByMood("award_winners"),
    getByMood("hidden_gems"),
    getByGenre("action"),
  ]);

  return (
    <main className="min-h-screen bg-background page-enter">
      {/* ── Cinematic Hero Carousel ────────────────── */}
      <HeroCarousel movies={trending} />

      {/* ── Content Rows ──────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 space-y-10 py-10">
        {/* Mood Discovery */}
        <section>
          <MoodSelector />
        </section>

        {/* Trending Globally */}
        <MovieRow title="🔥 Trending This Week" movies={trendingAll} />

        {/* Trending in India */}
        <MovieRow title="🇮🇳 Trending in India" movies={indianMovies} />

        {/* Now Playing */}
        <MovieRow title="🎬 Now Playing in Theaters" movies={nowPlaying} />

        {/* Korean Sensations */}
        <MovieRow title="🇰🇷 Korean Cinema" movies={koreanMovies} />

        {/* Award Winners */}
        <MovieRow title="🏆 Award-Winning Masterpieces" movies={awardWinners} />

        {/* Top Rated All Time */}
        <MovieRow title="⭐ Top Rated of All Time" movies={topRated} />

        {/* Hidden Gems */}
        <MovieRow title="💎 Hidden Gems from Around the World" movies={hiddenGems} />

        {/* Japanese / Anime */}
        <MovieRow title="🇯🇵 Japanese Cinema & Anime" movies={anime} />

        {/* French Cinema */}
        <MovieRow title="🇫🇷 French Cinema" movies={frenchMovies} />

        {/* Action */}
        <MovieRow title="⚔️ Adrenaline Rush — Action" movies={actionMovies} />

        {/* Cinema World Map */}
        <section className="pt-6">
          <CinemaWorldMap />
        </section>
      </div>
    </main>
  );
}
