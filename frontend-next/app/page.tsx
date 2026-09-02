import { Compass, Sparkles } from "lucide-react";
import Link from "next/link";
import MovieRow from "../components/MovieRow";

export default async function Home() {
  let homeData: any = {
    featured: null,
    trending: [],
    topRated: [],
    regions: {},
    coldStartCollections: []
  };

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${API_URL}/api/v1/home`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      homeData = {
        featured: data.featured || null,
        trending: data.trending || [],
        topRated: data.topRated || [],
        regions: data.regions || {},
        coldStartCollections: data.coldStartCollections || []
      };
    } else {
      const trendRes = await fetch(`${API_URL}/api/v1/movies/trending`);
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        const results = trendData.results || trendData.movies || [];
        homeData.trending = results;
        homeData.featured = results[0] || null;
        homeData.topRated = [...results].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
      }
    }
  } catch (error) {
    console.error("Failed to load home data:", error);
  }

  return (
    <main className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] lg:h-[80vh] flex items-center justify-center overflow-hidden border-b border-border/40">
        <img src={homeData.featured?.backdrop_url || homeData.featured?.poster_url || ""} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background z-10" />
        <div className="absolute inset-0 bg-secondary/10" />
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Discover Your Next Favorite Movie
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
            Find the Best <span className="text-primary">Movies</span> to Watch
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Get personalized movie recommendations based on your preferences.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/discover"
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Compass className="w-5 h-5" />
              Start Discovery
            </Link>
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
            movies={(movies as any) || []} 
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
