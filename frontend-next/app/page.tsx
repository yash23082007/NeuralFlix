import { BarChart3, Database, GitBranch, Gauge, Layers3 } from "lucide-react";
import CinemaWorldMap from "../components/CinemaWorldMap";
import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";
import { MoodPicker } from "../components/recommendation/MoodPicker";
import {
  getAnime,
  getByGenre,
  getByMood,
  getByRegion,
  getMlOverview,
  getNowPlaying,
  getTopRated,
  getTrending,
  getTrendingAll,
} from "../lib/api";

export const dynamic = "force-dynamic";

const metricIcons = [Database, Gauge, GitBranch, Layers3];

export default async function HomePage() {
  const [
    trending,
    topRated,
    nowPlaying,
    trendingAll,
    indianMovies,
    koreanMovies,
    japaneseMovies,
    frenchMovies,
    anime,
    awardWinners,
    hiddenGems,
    actionMovies,
    mlOverview,
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
    getMlOverview(),
  ]);

  const metrics = [
    { label: "Catalog items", value: mlOverview?.catalog_size || trending.length, detail: "served locally when DB is offline" },
    { label: "Mean rating", value: mlOverview?.average_rating?.toFixed(2) || "0.00", detail: "normalized cross-source score" },
    { label: "Recall paths", value: "3", detail: "content, collaborative, popularity" },
    { label: "Ranking pass", value: "MMR", detail: "genre-aware diversification" },
  ];

  return (
    <main className="min-h-screen bg-background page-enter">
      <HeroCarousel movies={trending.length ? trending : trendingAll} />

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-4 md:px-6">
        {metrics.map((metric, index) => {
          const Icon = metricIcons[index] || BarChart3;
          return (
            <div key={metric.label} className="rounded-lg border border-border bg-surface p-4 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-text-muted">{metric.label}</span>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="text-3xl font-black text-text-primary">{metric.value}</div>
              <p className="mt-1 text-xs font-semibold text-text-muted">{metric.detail}</p>
            </div>
          );
        })}
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 md:px-6">
        <MoodPicker />

        {mlOverview?.pipeline && (
          <section className="rounded-lg border border-border bg-surface p-5 shadow-card">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-accent">Pipeline</p>
                <h2 className="text-2xl font-black text-text-primary">Multi-stage recommender</h2>
              </div>
              <BarChart3 className="h-6 w-6 text-accent" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {mlOverview.pipeline.map((stage, index) => (
                <div key={stage.stage} className="rounded-lg border border-border bg-bg-elevated p-4">
                  <span className="text-xs font-black text-accent">0{index + 1}</span>
                  <h3 className="mt-3 text-sm font-black text-text-primary">{stage.stage}</h3>
                  <p className="mt-1 text-xs leading-5 text-text-muted">{stage.method}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-10">
          <MovieRow title="Trending recall set" movies={trendingAll} seeAllHref="/discover" />
          <MovieRow title="Fresh theatrical candidates" movies={nowPlaying} />
          <MovieRow title="Highest confidence matches" movies={topRated} />
          <MovieRow title="Action-heavy ranking" movies={actionMovies} />
          <MovieRow title="Indian cinema cluster" movies={indianMovies} seeAllHref="/cinema/indian" />
          <MovieRow title="Korean cinema cluster" movies={koreanMovies} seeAllHref="/cinema/korean" />
          <MovieRow title="Japanese animation and drama" movies={anime.length ? anime : japaneseMovies} seeAllHref="/cinema/japanese" />
          <MovieRow title="French cinema cluster" movies={frenchMovies} seeAllHref="/cinema/french" />
          <MovieRow title="Award-weighted ranking" movies={awardWinners} />
          <MovieRow title="Long-tail discovery" movies={hiddenGems} />
        </div>

        <section className="space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accent">Regional embeddings</p>
            <h2 className="text-2xl font-black text-text-primary">Global cinema map</h2>
          </div>
          <CinemaWorldMap />
        </section>
      </div>
    </main>
  );
}
