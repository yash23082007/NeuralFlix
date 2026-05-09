import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";
import { MoodPicker } from "../components/recommendation/MoodPicker";
import CinemaWorldMap from "../components/CinemaWorldMap";
import {
  getTrending, getTopRated, getNowPlaying, getTrendingAll,
  getAnime, getByRegion, getByMood, getByGenre,
} from "../lib/api";

export const revalidate = 1800; // ISR: refresh every 30 minutes

export default async function HomePage() {
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
    <main className="min-h-screen bg-background page-enter film-grain relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-neural-crimson/20 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none" />
      <div className="absolute top-[20%] right-10 w-[40vw] h-[40vw] bg-neural-electric/10 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none" />

      {/* ── Cinematic Hero Carousel ────────────────── */}
      <HeroCarousel movies={trending} />

      {/* ── Content Rows ──────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 space-y-12 py-12 relative z-10">
        
        {/* Mood Discovery (Glassmorphism wrapper) */}
        <section className="glass-card p-6 md:p-8 transform transition-transform hover:scale-[1.01] duration-500 shadow-glow">
          <MoodPicker />
        </section>

        <div className="space-y-10">
          <MovieRow title="🔥 Trending Globally" movies={trendingAll} />
          
          <div className="glass-card p-6 border-l-4 border-l-accent-india">
            <MovieRow title="🇮🇳 Blockbusters from India" movies={indianMovies} />
          </div>

          <MovieRow title="🎬 Now Playing in Theaters" movies={nowPlaying} />
          <MovieRow title="🇰🇷 Korean Sensations" movies={koreanMovies} />
          
          <div className="glass-card p-6 border-l-4 border-l-imdb-gold bg-gradient-to-r from-imdb-gold/5 to-transparent">
            <MovieRow title="🏆 Award-Winning Masterpieces" movies={awardWinners} />
          </div>

          <MovieRow title="⭐ Top Rated of All Time" movies={topRated} />
          <MovieRow title="💎 Hidden Gems" movies={hiddenGems} />
          <MovieRow title="🇯🇵 Japanese Cinema & Anime" movies={anime} />
          <MovieRow title="🇫🇷 French Cinema" movies={frenchMovies} />
          <MovieRow title="⚔️ Adrenaline Rush — Action" movies={actionMovies} />
        </div>

        {/* Cinema World Map */}
        <section className="pt-10">
          <div className="glass-card p-4 md:p-8 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-neural-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CinemaWorldMap />
          </div>
        </section>
      </div>
    </main>
  );
}
