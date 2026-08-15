import { Compass, Sparkles } from "lucide-react";
import { Movie } from "../lib/types";
import Link from "next/link";
import MovieRow from "../components/movie/MovieRow";
import { getHome } from "../lib/api";

import { BackendWakingState } from "../components/shared/BackendWakingState";

export const revalidate = 300;

export default async function Home() {
  let homeData = {
    featured: {},
    trending: [],
    topRated: [],
    regions: {},
    coldStartCollections: []
  };

  let fetchFailed = false;

  try {
    const data = await getHome();
    if (data) {
      homeData = { ...homeData, ...data };
    }
  } catch (error) {
    console.error("Failed to load home data:", error);
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <main className="min-h-screen pb-20 pt-20">
        <BackendWakingState />
      </main>
    );
  }

  const featured = homeData.featured as Record<string, unknown> | null;
  const backdropUrl = featured?.backdrop_url as string | undefined;
  const featuredTitle = featured?.title as string | undefined;
  const featuredId = featured?.tmdb_id as number | undefined;

  return (
    <main className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] lg:h-[80vh] flex items-center justify-center overflow-hidden border-b border-border/40">
        {backdropUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background z-10" />
        {!backdropUrl && <div className="absolute inset-0 bg-secondary/10" />}
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            Explainable Global Cinema Atlas
          </div>
          {featuredTitle ? (
            <>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
                {featuredTitle}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                NeuralFlix is not a black-box recommender. It is a deterministic engine where you control the weights, genres, and diversity.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
                Discover Your <span className="text-primary">Taste</span> in World Cinema
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                NeuralFlix is not a black-box recommender. It is a deterministic engine where you control the weights, genres, and diversity.
              </p>
            </>
          )}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/discover"
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Compass className="w-5 h-5" />
              Start Discovery
            </Link>
            {featuredId && (
              <Link
                href={`/movie/${featuredId}`}
                className="px-8 py-3 rounded-full bg-white/10 text-white font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
              >
                View Details
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="max-w-[2000px] mx-auto px-4 md:px-8 xl:px-12 space-y-24 py-20">
        
        <MovieRow 
          title="Trending Now" 
          movies={homeData.trending || []} 
          seeAllHref="/discover?sort=popularity" 
        />
        
        <MovieRow 
          title="Top Rated" 
          movies={homeData.topRated || []} 
          seeAllHref="/discover?sort=rating" 
        />
        
        {/* Render Region rows if they exist */}
        {Object.entries(homeData.regions || {}).map(([region, movies]) => (
          <MovieRow 
            key={region}
            title={`${region.charAt(0).toUpperCase() + region.slice(1)} Cinema`}
            movies={(movies as Movie[]) || []}
            seeAllHref={`/discover?region=${region}`} 
          />
        ))}

        {/* Cold Start Collections */}
        {homeData.coldStartCollections && homeData.coldStartCollections.length > 0 && (
          <MovieRow 
            title="Curated Collections" 
            movies={homeData.coldStartCollections} 
          />
        )}
      </div>
    </main>
  );
}
