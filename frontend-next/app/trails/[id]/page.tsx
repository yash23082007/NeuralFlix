import { getTrail, getMovieDetails } from "../../../lib/api";
import { MovieCard } from "../../../components/movie/MovieCard";
import type { CinemaTrail, MovieDetail } from "../../../lib/types";

export default async function TrailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  let trail: CinemaTrail | null = null;
  let movies: MovieDetail[] = [];
  
  try {
    trail = await getTrail(resolvedParams.id);
    if (trail?.movies) {
      movies = await Promise.all(
        trail.movies.map((movie: { tmdb_id: number }) => getMovieDetails(movie.tmdb_id))
      );
    }
  } catch (error) {
    console.error("Failed to load trail detail:", error);
  }

  if (!trail) {
    return (
      <main className="min-h-screen pt-24 pb-20 px-4 max-w-7xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Trail Not Found</h1>
        <p className="text-[var(--text-muted)]">
          The requested cinema trail could not be loaded at this time.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">{trail.theme}</h1>
        <p className="text-xl text-[var(--text-muted)] max-w-3xl">
          {trail.description}
        </p>
      </div>
      
      <div className="relative">
        {/* Trail line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--accent-warm)] to-[var(--accent-cool)] hidden md:block" />
        
        <div className="space-y-24">
          {movies.map((movie, idx) => (
            <div key={movie.tmdb_id || idx} className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="w-64 relative">
                  {/* Node point */}
                  <div className={`absolute top-1/2 -mt-3 w-6 h-6 rounded-full bg-[var(--surface-elevated)] border-4 border-[var(--accent-warm)] z-10 hidden md:block ${idx % 2 === 1 ? 'left-[-4rem]' : 'right-[-4rem]'}`} />
                  <MovieCard movie={movie} />
                </div>
              </div>
              <div className="w-full md:w-1/2">
                <h2 className="text-2xl font-bold mb-2">{movie.title}</h2>
                <p className="text-[var(--text-muted)] line-clamp-4">{movie.overview}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
