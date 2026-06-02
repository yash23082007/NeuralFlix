import {
  ArrowRight,
  Globe,
  Star,
  TrendingUp,
  Layers,
  Film,
  Compass,
} from "lucide-react";
import { Suspense } from "react";
import CinemaWorldMap from "../components/CinemaWorldMap";
import MovieRow from "../components/MovieRow";
import RowSkeleton from "../components/RowSkeleton";
import PersonalizedRecommendations from "../components/recommendation/PersonalizedRecommendations";
import {
  getAnime,
  getByGenre,
  getByMood,
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
    title: "Electric Dreams",
    year: 2024,
    rating: 9.1,
    genres: ["Sci-Fi", "Drama"],
    director: "Sato",
    poster_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDZp61_shKDtVFquc0hX5P_hmYUtE0I5S1DcNzqTueF5V-ujB9ztf7_4W76tFk0xI3kSXOrVYZ-pIOA-0eZWk6UraaGa0lZu9FvTzSAG1P2Jq8sGtoaUxbeXlShPbBif2chDYBvaFSwj6TObdChmrkZmu_m6XUrL63_Igu4W7NvwD4d-zwzcNtE4RiL6P2Wj-OP9_KkMxUNtcPHEFM2aWfDzey9doVl8qYK7FJNfh-Jjk0x23WTXE2TCacGL92BUdKynw7iPKB38eI",
  }) as any;

  const sideMovies = [
    (trendingAll?.[1] || {
      title: "The Frozen Path",
      region: "Nordic",
      poster_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD-XcPfGAl9JY2D8TgZF4ViqcmwjtvFwswNJsl9u2XK8zdqE7I-a9jS8BZoIMPSNAenrwv0QH9oQ3I4k2FiPtcg2JGewBVPUkjIFMpIrgvZVvj74gA8eYYi3ZBHr1bsb4LZlrdnHc9s5PVt3FvT43F9JMyRYiwHS21X5bcvD8HfUwVNHHmcgTCmuJQ2G2Wu0kKimrNNM57cZLHNHNW4MQA2o2gRpCSVlXljM54TCx9jmYAGRgW6TOz3mxKRjjZZ0RqLmFrSdWV0S8U",
    }) as any,
    (trendingAll?.[2] || {
      title: "Echoes of Gold",
      region: "Latin America",
      poster_url:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD8Mk9yXH7A6hzGwA2rWZotVEtk7bDvUCWDXcTF8v28G_VaDiW8fAv1wHEpkZZxjyrovewO6yfs3sK8TEaYStjfeg9u7hMVPjcjZF7t2cJ9J5yPOBICZCk0CIZic89Sft_4SOaiZV2JWA81Cqib3WrW0daw8I_66nr8sSYjyv4edv4-D5JorvVBkwAgYSBwnin1bXjTrbHYD_7JKSwIczogzpABNwme8JOCIHJ6A5lP-MU_WtHimgLe-HVcSg_nkC7rmwL-ZCrsweY",
    }) as any,
  ];

  const catalogSize = mlOverview?.catalog_size || 50000;
  const topGenres = mlOverview?.top_genres?.slice(0, 3) || [];

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] relative overflow-hidden page-enter">
      {/* ── Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-end overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover opacity-40 filter brightness-75 scale-105"
            alt="Hero Background"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnU3v5zk29nqbbtpBCibp3lIdqH-_REgrgxWZqMHxg0VNjlUcEAvRoSA7Z-XreBjN27NmCzRTDZK8tTsazunE6na6ZLfFIfish9OiSEt6xyxmfRTj5gyv5Wjo4mYYArLxiKv2GDiH5UJzZZofLwnWpbUSdIs5hcUrojEJl8j6x3kTeFNM6ZtitTAd4Ts9xzXaPE8EIV1MycYVJGJC85qUDE9GwXRUjoi0KPopdo6JTOBaklLg7Rp6AjlIBBk0p252YxBhEjJy8qxY"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/70 to-[var(--surface-primary)]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-primary)]/80 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 px-5 sm:px-8 md:px-12 w-full max-w-7xl mx-auto pb-20 pt-32 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
          {/* Left Content */}
          <div className="max-w-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-[1px] w-10 bg-[var(--accent-warm)]" />
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--accent-warm)]">
                Curated Cinema Collection
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.05] mb-8 font-[var(--font-playfair)]">
              Discover Films <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)]">
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
                className="bg-[var(--accent-warm)] text-black font-semibold px-7 py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-glow flex items-center gap-2"
              >
                Explore Catalog
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/recommendations"
                className="bg-[var(--surface-elevated)]/50 border border-[var(--border-default)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-medium px-7 py-3.5 rounded-xl active:scale-[0.98] transition-all backdrop-blur-md"
              >
                My Recommendations
              </a>
            </div>
          </div>

          {/* Right: Stats Card */}
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/60 backdrop-blur-xl p-6 shadow-lg w-72">
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
                <TrendingUp className="h-4 w-4" />
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
              className="col-span-12 md:col-span-8 group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] flex flex-col justify-end transition-all duration-500 hover:border-[var(--border-accent)] min-h-[360px] md:min-h-0"
            >
              <img
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-50 group-hover:opacity-70"
                src={featuredMovie.poster_url}
                alt={featuredMovie.title}
              />
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
                <div
                  key={i}
                  className="flex-1 group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] flex flex-col justify-end transition-all duration-500 hover:border-[var(--border-accent)] cursor-pointer min-h-[200px]"
                >
                  <img
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-40 group-hover:opacity-60"
                    src={m.poster_url}
                    alt={m.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] via-[var(--surface-primary)]/40 to-transparent" />
                  <div className="relative z-10 p-6">
                    <span className="bg-[var(--accent-rose)]/10 backdrop-blur-md text-[var(--accent-rose)] px-2.5 py-0.5 rounded-md text-[10px] font-semibold mb-2 inline-block border border-[var(--accent-rose)]/20">
                      {m.region || "World Cinema"}
                    </span>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-rose)] transition-colors">
                      {m.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Rows (Loaded progressively via React Suspense) */}
        <section className="space-y-14">
          <Suspense fallback={<RowSkeleton label="Trending Now" />}>
            <TrendingRowComponent />
          </Suspense>
          
          <Suspense fallback={<RowSkeleton label="Indian Cinema" />}>
            <RegionRowComponent region="indian" title="Indian Cinema" seeAllHref="/cinema?region=indian" />
          </Suspense>
          
          <Suspense fallback={<RowSkeleton label="Korean Masterpieces" />}>
            <RegionRowComponent region="korean" title="Korean Masterpieces" seeAllHref="/cinema?region=korean" />
          </Suspense>

          <Suspense fallback={<RowSkeleton label="Japanese Cinema Spotlight" />}>
            <RegionRowComponent region="japanese" title="Japanese Cinema Spotlight" seeAllHref="/cinema?region=japanese" />
          </Suspense>

          <Suspense fallback={<RowSkeleton label="Anime Spotlight" />}>
            <AnimeRowComponent />
          </Suspense>
        </section>

        {/* Director Spotlights */}
        <section className="py-10 rounded-2xl p-6 md:p-8 border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 relative overflow-hidden">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Director Spotlights
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">
              Visionary filmmakers shaping global cinema.
            </p>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar scroll-smooth">
            {[
              {
                name: "Elena Moretti",
                titles: "7 films available",
                image:
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuADfvvBxPHCPOCL0hnlsk2prVK8lSBx39TvKnzimK8IUYnZqb7a8j9_yf8Op10ahXeiV23ShApoc3TkZr7ERx8CJAZgKvCGP3lFcjtt-obEx5sTZ3m4QN0efPZknPo-LREQ5xM-sYTw7UlQXiZo2xxVh4x_EgzU-nIkq92P-dYwR1-Dg0wsRN3_-YZ709hWbvfkM7oWWsUYRRWyHibu4imqPLKie85cAmMcCADm4Cxa4nGwjTAVkxFIggatDOXEsgH9NECAxBGAiJQ",
              },
              {
                name: "Marcus Thorne",
                titles: "12 films available",
                image:
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuA6ddDWqx5M9m3NNuthHth3CN-iT2EM7BjEFqbbkxe9-Yfc-IRPx5dxFeuko_FwQB5-JiL-iahloH77rLdLqc6bcZFrH3hclWkbyIX4zKeJnVob4gJ5_HKFjCIKC3KCyY7xpXWNoYk79cL0srorY8zgA65nPbL4C1BHhS-qbFH3JRlJz_lt2npYYAxfg58cBZIVo9VfV6UcUmEFmzO0B6wbfhfv9xKu3fZl3ZRrkz4MIdAONghru1Yru4JbE5-HKPy68q9ih0rY0l0",
              },
              {
                name: "Yumi Akasaka",
                titles: "5 films available",
                image:
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuDOc1nuV_jIPKYiqWeC81yXedc6OUNxlKm19lT-WF9pdRpWPDbzMgTahvL2emGXwBLgqzlLhaWLJCHbOib066k1espfMzVVf4W0dZldoeQ537hoVgqmUMWAJ-AgGNAULLdy4aq42d4fb6yw-dbu2WHIcEZEksnUHxuPZNKs9ln7J3WgV49CzKrFBFa92Di_I8wfYcf0G8w3NCO0t9bhlRq-Cz_1Qfg2C1_NqqwMBp7WSLrGzAKQzc30_zxjrvZfOsFKmX8AEzYU6E8",
              },
            ].map((dir, idx) => (
              <div key={idx} className="flex-none w-[300px] group cursor-pointer">
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--border-subtle)] mb-5 transition-all duration-500 group-hover:shadow-xl group-hover:border-[var(--border-accent)]">
                  <img
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                    src={dir.image}
                    alt={dir.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] to-transparent opacity-60" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-warm)] transition-colors">
                  {dir.name}
                </h4>
                <p className="text-[var(--text-tertiary)] text-xs mt-1">
                  {dir.titles}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Global Cinema Map */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
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
          <div className="overflow-hidden rounded-2xl p-4 md:p-8 border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 backdrop-blur-sm">
            <CinemaWorldMap />
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
      seeAllHref="/cinema?region=japanese"
    />
  );
}
