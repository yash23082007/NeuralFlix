import { Database, Gauge, GitBranch, Layers3, Sparkles, TrendingUp, Zap, Globe } from "lucide-react";
import CinemaWorldMap from "../components/CinemaWorldMap";
import HeroScene from "../components/three/HeroScene";
import MovieCard3D from "../components/three/MovieCard3D";
import MovieRow from "../components/MovieRow";
import PersonalizedRecommendations from "../components/recommendation/PersonalizedRecommendations";
import RecommendationOrb from "../components/three/RecommendationOrb";
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
    { label: "Catalog Items", value: mlOverview?.catalog_size || trending.length, detail: "Movies in recommendation index", icon: Database },
    { label: "Avg Rating", value: mlOverview?.average_rating?.toFixed(2) || "0.00", detail: "Normalized cross-source score", icon: Gauge },
    { label: "Recall Paths", value: "3", detail: "Content, collaborative, popularity", icon: GitBranch },
    { label: "Diversity", value: "MMR", detail: "Genre-aware diversification", icon: Layers3 },
  ];

  return (
    <main className="min-h-screen bg-background relative">
      {/* Background Recommendation Orb */}
      <div className="fixed top-20 right-0 h-[600px] w-[600px] opacity-20 pointer-events-none blur-xl">
        <RecommendationOrb />
      </div>
      <div className="fixed bottom-0 left-0 h-[400px] w-[400px] opacity-10 pointer-events-none blur-3xl bg-accent rounded-full" />

      <HeroScene>
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto h-full">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent backdrop-blur-md">
            <Zap className="h-3 w-3" />
            Next-Gen Recommendation Engine
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-text-primary leading-[0.9]">
            Cinema <span className="text-accent">Redefined</span>.
          </h1>
          <p className="mt-8 text-xl text-text-muted font-medium max-w-2xl leading-relaxed">
            NeuralFlix uses advanced matrix factorization and sequential transformers to map your cinema DNA.
          </p>
          
          <div className="mt-12 flex gap-4">
            <button className="rounded-2xl premium-gradient px-8 py-4 text-sm font-black text-white shadow-glow transition-all hover:scale-105 active:scale-95">
              Explore Discover
            </button>
            <button className="rounded-2xl border border-glass-border bg-glass px-8 py-4 text-sm font-black text-text-primary backdrop-blur-md transition-all hover:bg-white/10">
              Watch Trailer
            </button>
          </div>
        </div>
      </HeroScene>

      {/* Stats dashboard */}
      <div className="relative z-10 -mt-16 mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-6 md:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="premium-card group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{metric.label}</span>
                <metric.icon className="h-5 w-5 text-accent transition-transform group-hover:scale-110" />
              </div>
              <div className="text-4xl font-black tracking-tight text-text-primary">{metric.value}</div>
              <p className="mt-2 text-[11px] font-bold text-text-muted/60">{metric.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl space-y-24 px-4 py-20 md:px-6">
        {/* Personalized Section */}
        <section className="space-y-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-accent mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">Real-time Predictions</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight text-text-primary">Tailored for You</h2>
            </div>
          </div>
          <PersonalizedRecommendations />
        </section>

        {/* Categories Grid or Strip */}
        <div className="space-y-20">
          <MovieRow title="Top Trending" movies={trendingAll} seeAllHref="/discover" />
          <MovieRow title="Recently Released" movies={nowPlaying} />
          
          {/* Architecture Highlight */}
          <section className="premium-card relative overflow-hidden rounded-3xl p-8 md:p-12">
            <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-accent mb-4">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-widest">ML Infrastructure</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight text-text-primary">The Neural Engine</h2>
                <p className="mt-6 text-lg text-text-muted leading-relaxed">
                  Our hybrid engine combines <span className="text-text-primary font-bold">Collaborative Filtering</span> for broad patterns, 
                  <span className="text-text-primary font-bold">Content-Based Filtering</span> for deep feature matching, 
                  and <span className="text-text-primary font-bold">Sequential Transformers</span> to predict your next watch session.
                </p>
                <div className="mt-10 grid grid-cols-2 gap-6">
                  {mlOverview?.pipeline?.slice(0, 4).map((stage) => (
                    <div key={stage.stage} className="space-y-2">
                      <h4 className="text-sm font-black text-text-primary">{stage.stage}</h4>
                      <p className="text-xs text-text-muted">{stage.method}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative aspect-square lg:aspect-auto h-[400px]">
                 <RecommendationOrb />
              </div>
            </div>
            {/* Background glow */}
            <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
          </section>

          <MovieRow title="Global Award Winners" movies={awardWinners} />
          <MovieRow title="Indian Cinema" movies={indianMovies} seeAllHref="/cinema/indian" />
          <MovieRow title="Korean Excellence" movies={koreanMovies} seeAllHref="/cinema/korean" />
        </div>

        {/* Cinema World Map */}
        <section className="space-y-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-accent">Global Coverage</p>
              <h2 className="text-4xl font-black tracking-tight text-text-primary">Cinema Map</h2>
            </div>
          </div>
          <div className="premium-card overflow-hidden rounded-3xl p-4 md:p-8">
            <CinemaWorldMap />
          </div>
        </section>
      </div>
    </main>
  );
}
