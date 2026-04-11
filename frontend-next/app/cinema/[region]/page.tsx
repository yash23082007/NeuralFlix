import { notFound } from "next/navigation";
import { MovieCard, Movie } from "../../../components/MovieCard";

const REGION_MAP: Record<string, { title: string; subtitle: string; flag: string; bgClass: string }> = {
  indian: { title: "Indian Cinema", subtitle: "Bollywood, Tollywood, Kollywood & Beyond", flag: "🇮🇳", bgClass: "from-[var(--accent-india)]" },
  korean: { title: "Korean Cinema", subtitle: "Korean New Wave & K-Drama Classics", flag: "🇰🇷", bgClass: "from-[var(--accent-korea)]" },
  japanese: { title: "Japanese Cinema", subtitle: "Anime, Samurai Classics & J-Horror", flag: "🇯🇵", bgClass: "from-[var(--accent-japan)]" },
  french: { title: "French Cinema", subtitle: "The French New Wave to Modern Hits", flag: "🇫🇷", bgClass: "from-[var(--accent-france)]" },
  spanish: { title: "Spanish-Language Cinema", subtitle: "Spain, Mexico & Latin America", flag: "🇪🇸", bgClass: "from-[#e67e22]" },
  nollywood: { title: "Nollywood", subtitle: "The Nigerian Film Industry", flag: "🇳🇬", bgClass: "from-[#f1c40f]" },
  iranian: { title: "Iranian Cinema", subtitle: "Critically Acclaimed Realism", flag: "🇮🇷", bgClass: "from-[#27ae60]" },
  hollywood: { title: "Hollywood", subtitle: "Global Box Office Giants", flag: "🇺🇸", bgClass: "from-accent" },
};

async function getMoviesByRegion(region: string) {
  try {
    const res = await fetch(`http://localhost:8000/api/movies/region/${region}?page=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch region movies:", error);
    return null;
  }
}

export default async function RegionPage({ params }: { params: { region: string } }) {
  const regionConfig = REGION_MAP[params.region.toLowerCase()];
  
  if (!regionConfig) {
    notFound();
  }

  const data = await getMoviesByRegion(params.region);
  const movies: Movie[] = data?.results || [];

  return (
    <div className="w-full relative pb-20">
      {/* Cinematic Hero Header */}
      <div className={`relative h-[40vh] w-full bg-gradient-to-r ${regionConfig.bgClass} to-background/5 p-8 flex flex-col justify-end overflow-hidden`}>
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <span className="text-6xl mb-4 block animate-bounce">{regionConfig.flag}</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
            {regionConfig.title}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl">
            {regionConfig.subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="section-heading">Top Rated Movies</h2>
          <div className="text-sm text-text-muted">Currently tracking thousands of {params.region} films</div>
        </div>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {movies.map((m) => (
              <MovieCard key={m.tmdb_id || m._id} movie={m} />
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-20 bg-surface rounded-xl border border-border">
            <div className="text-4xl mb-4 opacity-50">🍿</div>
            <h3 className="text-xl font-semibold mb-2">No movies found</h3>
            <p className="text-text-muted">Our database might still be populating this region.</p>
          </div>
        )}
      </div>
    </div>
  );
}
