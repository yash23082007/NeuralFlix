import { Database, Gauge, GitBranch, Layers3, Sparkles } from "lucide-react";
import CinemaWorldMap from "../components/CinemaWorldMap";
import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";
import { MoodPicker } from "../components/recommendation/MoodPicker";
import {
  getAnime, getByGenre, getByMood, getByRegion, getMlOverview,
  getNowPlaying, getTopRated, getTrending, getTrendingAll,
} from "../lib/api";

export const dynamic = "force-dynamic";

const metricIcons = [Database, Gauge, GitBranch, Layers3];

export default async function HomePage() {
  const [
    trending, topRated, nowPlaying, trendingAll, indianMovies,
    koreanMovies, japaneseMovies, frenchMovies, anime, awardWinners,
    hiddenGems, actionMovies, mlOverview,
  ] = await Promise.all([
    getTrending(), getTopRated(), getNowPlaying(), getTrendingAll(),
    getByRegion("indian"), getByRegion("korean"), getByRegion("japanese"),
    getByRegion("french"), getAnime(), getByMood("award_winners"),
    getByMood("hidden_gems"), getByGenre("action"), getMlOverview(),
  ]);

  const metrics = [
    { label: "Catalog Items", value: mlOverview?.catalog_size || trending.length, detail: "Movies in recommendation index" },
    { label: "Avg Rating", value: mlOverview?.average_rating?.toFixed(2) || "0.00", detail: "Normalized cross-source score" },
    { label: "Recall Paths", value: "3", detail: "Content, collaborative, popularity" },
    { label: "Diversity", value: "MMR", detail: "Genre-aware diversification" },
  ];

  return (
    <main className="min-h-screen bg-background page-enter">
      <HeroCarousel movies={trending.length ? trending : trendingAll} />

      {/* Stats dashboard */}
      <div className="relative z-10 -mt-10 mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metricIcons[index] || Sparkles;
            return (
              <div key={metric.label} className="premium-card group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{metric.label}</span>
                  <Icon className="h-4 w-4 text-accent transition-transform group-hover:scale-110" />
                </div>
                <div className="text-3xl font-bold tracking-tight text-text-primary">{metric.value}</div>
                <p className="mt-1.5 text-xs text-text-muted">{metric.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 md:px-6">
        <MoodPicker />

        {/* Pipeline section */}
        {mlOverview?.pipeline && (
          <section className="premium-card rounded-2xl p-6 md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">Architecture</p>
                <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">Multi-Stage Recommender</h2>
              </div>
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {mlOverview.pipeline.map((stage, index) => (
                <div key={stage.stage} className="relative rounded-xl border border-border bg-white/70 p-5 transition-all hover:border-accent/30">
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-accent/60">0{index + 1}</span>
                  <h3 className="text-sm font-bold text-text-primary mt-1">{stage.stage}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">{stage.method}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Movie rows */}
        <div className="space-y-12">
          <MovieRow title="Trending Now" movies={trendingAll} seeAllHref="/discover" />
          <MovieRow title="In Theaters" movies={nowPlaying} />
          <MovieRow title="Top Rated" movies={topRated} />
          <MovieRow title="Action" movies={actionMovies} />
          <MovieRow title="Indian Cinema" movies={indianMovies} seeAllHref="/cinema/indian" />
          <MovieRow title="Korean Cinema" movies={koreanMovies} seeAllHref="/cinema/korean" />
          <MovieRow title="Japanese Animation" movies={anime.length ? anime : japaneseMovies} seeAllHref="/cinema/japanese" />
          <MovieRow title="French Cinema" movies={frenchMovies} seeAllHref="/cinema/french" />
          <MovieRow title="Award Winners" movies={awardWinners} />
          <MovieRow title="Hidden Gems" movies={hiddenGems} />
        </div>

        {/* World Map */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-full bg-gradient-to-b from-accent to-neural-purple" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">Global</p>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">Cinema World Map</h2>
            </div>
          </div>
          <div className="premium-card rounded-2xl p-4 md:p-6">
            <CinemaWorldMap />
          </div>
        </section>
      </div>
    </main>
  );
}
