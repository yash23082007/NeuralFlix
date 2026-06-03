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
import MovieRow from "../components/MovieRow";
import RowSkeleton from "../components/RowSkeleton";
import PersonalizedRecommendations from "../components/recommendation/PersonalizedRecommendations";
import {
  getAnime,
  getByRegion,
  getMlOverview,
  getTrendingAll,
} from "../lib/api";

export const revalidate = 300;

export default async function HomePage() {
  const [trendingAll, mlOverview] = await Promise.all([
    getTrendingAll(),
    getMlOverview(),
  ]);

  const featuredMovie = (trendingAll?.[0] || {
    title: "Discover Global Cinema",
    year: 2024,
    rating: 9.1,
    genres: ["Sci-Fi", "Drama"],
    director: "NeuralFlix",
    poster_url: null,
  }) as any;

  const sideMovies = [
    (trendingAll?.[1] || {
      title: "World Cinema",
      region: "Global",
      poster_url: null,
    }) as any,
    (trendingAll?.[2] || {
      title: "Hidden Gems",
      region: "Worldwide",
      poster_url: null,
    }) as any,
  ];

  const catalogSize = mlOverview?.catalog_size || 50000;
  const topGenres = mlOverview?.top_genres?.slice(0, 3) || [];

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden page-enter">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[92vh] flex items-end overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          {featuredMovie.backdrop_url || featuredMovie.poster_url ? (
            <img
              className="w-full h-full object-cover opacity-30 filter brightness-75 scale-105"
              alt="Hero Background"
              src={featuredMovie.backdrop_url || featuredMovie.poster_url}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--surface-overlay)] via-[var(--surface-primary)] to-[var(--surface-primary)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/75 to-[var(--surface-primary)]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-primary)]/90 via-transparent to-transparent" />
          {/* Animated mesh gradient */}
          <div className="absolute inset-0 opacity-30 animate-gradient-shift" style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(232,168,73,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(212,99,122,0.04) 0%, transparent 50%)",
          }} />
        </div>

        <div className="relative z-10 px-5 sm:px-8 md:px-12 w-full max-w-7xl mx-auto pb-20 pt-32 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
          {/* Left Content */}
          <div className="max-w-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-[1px] w-10 bg-[var(--accent-warm)]" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-warm)] animate-text-glow">
                ML-Powered Cinema Discovery
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.05] mb-8 font-[var(--font-playfair)]">
              Discover Films <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] animate-gradient-shift" style={{ backgroundSize: "200% 200%" }}>
                Worth Watching
              </span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-10 max-w-lg leading-relaxed">
              Explore world cinema with ML-powered recommendations. From Indian
              masterpieces to Nordic noir, find your next favorite film.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="/discover"
                className="group bg-[var(--accent-warm)] text-black font-semibold px-7 py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-glow flex items-center gap-2"
              >
                Explore Catalog
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/recommendations"
                className="group bg-[var(--surface-elevated)]/50 border border-[var(--border-default)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] text-[var(--text-primary)] font-medium px-7 py-3.5 rounded-xl active:scale-[0.98] transition-all backdrop-blur-md flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-[var(--accent-warm)]" />
                My Recommendations
              </a>
            </div>
          </div>

          {/* Right: Stats Card */}
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/60 backdrop-blur-xl p-6 shadow-lg w-72 animate-pulse-glow">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">
                    Catalog Size
                  </p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {catalogSize.toLocaleString()}+ Films
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                {topGenres.map(
                  (g: { name: string; count: number }, i: number) => (
                    <div key={g.name} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{g.name}</span>
                      <span className="text-[var(--text-tertiary)] font-medium text-xs">
                        {g.count.toLocaleString()}
                      </span>
                    </div>
                  )
                )}
              </div>
              {mlOverview?.pipeline && (
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mb-2">
                    ML Pipeline
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mlOverview.pipeline.slice(0, 3).map((p: any) => (
                      <span
                        key={p.stage}
                        className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)] font-medium"
                      >
                        {p.method}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-5 sm:px-8 md:px-12 py-20 space-y-24">
        {/* Personalized Recommendations */}
        <section className="space-y-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-[var(--accent-warm)] mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  For You
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Recommended Films
              </h2>
            </div>
            <a
              href="/recommendations"
              className="text-[var(--accent-warm)] font-medium text-sm hover:underline flex items-center gap-1.5"
            >
              View All <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="rounded-2xl p-6 md:p-8 border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 backdrop-blur-sm">
            <PersonalizedRecommendations />
          </div>
        </section>

        {/* Regional Masterpieces — Bento Grid */}
        <section className="relative">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                Regional Highlights
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Exceptional cinema from around the world.
              </p>
            </div>
            <a
              className="text-[var(--accent-warm)] font-medium text-sm flex items-center gap-1 hover:underline"
              href="/discover"
            >
              View All <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[520px]">
            {/* Featured */}
            <a
              href={`/movie/${featuredMovie.tmdb_id || featuredMovie.id || 1}`}
              className="col-span-12 md:col-span-8 group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] flex flex-col justify-end transition-all duration-500 hover:border-[var(--border-accent)] hover:shadow-glow min-h-[360px] md:min-h-0"
            >
              {(featuredMovie.backdrop_url || featuredMovie.poster_url) ? (
                <img
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-40 group-hover:opacity-60"
                  src={featuredMovie.backdrop_url || featuredMovie.poster_url}
                  alt={featuredMovie.title}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-muted)] to-[var(--surface-primary)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/30 to-transparent" />
              <div className="relative z-10 p-8 md:p-10">
                <span className="bg-[var(--accent-warm)]/15 backdrop-blur-md text-[var(--accent-warm)] px-3 py-1 rounded-lg text-xs font-semibold mb-4 inline-block border border-[var(--accent-warm)]/25">
                  Featured Pick
                </span>
                <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-[var(--accent-warm)] transition-colors">
                  {featuredMovie.title}
                </h3>
                <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                  <span>{featuredMovie.year}</span>
                  <span>·</span>
                  <span>
                    Dir. {featuredMovie.director || "Unknown"}
                  </span>
                  <span>·</span>
                  <div className="flex items-center text-[var(--rating-gold)]">
                    <Star className="h-3.5 w-3.5 mr-1 fill-current" />
                    {featuredMovie.rating?.toFixed(1) || "9.1"}
                  </div>
                </div>
              </div>
            </a>

            {/* Side Items */}
            <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
              {sideMovies.map((m, i) => (
                <a
                  key={i}
                  href={m.tmdb_id ? `/movie/${m.tmdb_id}` : "/discover"}
                  className="flex-1 group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] flex flex-col justify-end transition-all duration-500 hover:border-[var(--border-accent)] hover:shadow-glow cursor-pointer min-h-[200px]"
                >
                  {m.poster_url ? (
                    <img
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-35 group-hover:opacity-55"
                      src={m.poster_url}
                      alt={m.title}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--surface-primary)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/40 to-transparent" />
                  <div className="relative z-10 p-6">
                    <span className="bg-[var(--accent-rose)]/10 backdrop-blur-md text-[var(--accent-rose)] px-2.5 py-0.5 rounded-md text-[10px] font-semibold mb-2 inline-block border border-[var(--accent-rose)]/20">
                      {m.region || m.language?.toUpperCase() || "World Cinema"}
                    </span>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-rose)] transition-colors">
                      {m.title}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Category Rows */}
        <section className="space-y-14">
          <Suspense fallback={<RowSkeleton label="Trending Now" />}>
            <TrendingRowComponent />
          </Suspense>
          
          <Suspense fallback={<RowSkeleton label="Indian Cinema" />}>
            <RegionRowComponent region="indian" title="Indian Cinema" seeAllHref="/cinema/indian" />
          </Suspense>
          
          <Suspense fallback={<RowSkeleton label="Korean Masterpieces" />}>
            <RegionRowComponent region="korean" title="Korean Masterpieces" seeAllHref="/cinema/korean" />
          </Suspense>

          <Suspense fallback={<RowSkeleton label="Japanese Cinema Spotlight" />}>
            <RegionRowComponent region="japanese" title="Japanese Cinema Spotlight" seeAllHref="/cinema/japanese" />
          </Suspense>

          <Suspense fallback={<RowSkeleton label="Anime Spotlight" />}>
            <AnimeRowComponent />
          </Suspense>
        </section>

        {/* Global Stats */}
        <section className="rounded-2xl p-6 md:p-8 border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] border border-[var(--accent-warm)]/15">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-warm)]">
                Global Coverage
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                Cinema World Map
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Languages", value: "20+", icon: Globe },
              { label: "Regions", value: "15+", icon: Compass },
              { label: "Films", value: `${(catalogSize / 1000).toFixed(0)}K+`, icon: Film },
              { label: "ML Models", value: "5", icon: Layers },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 p-5 text-center backdrop-blur-sm animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <stat.icon className="h-5 w-5 text-[var(--accent-warm)] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

// ─── Progressive Loading Components ───

async function TrendingRowComponent() {
  const movies = await getTrendingAll();
  return (
    <MovieRow
      title="Trending Now"
      movies={movies}
      seeAllHref="/discover"
    />
  );
}

async function RegionRowComponent({
  region,
  title,
  seeAllHref,
}: {
  region: string;
  title: string;
  seeAllHref: string;
}) {
  const movies = await getByRegion(region);
  return (
    <MovieRow
      title={title}
      movies={movies}
      seeAllHref={seeAllHref}
    />
  );
}

async function AnimeRowComponent() {
  const movies = await getAnime();
  return (
    <MovieRow
      title="Anime Spotlight"
      movies={movies}
      seeAllHref="/cinema/japanese"
    />
  );
}
