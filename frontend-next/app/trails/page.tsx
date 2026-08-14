import { getTrails } from "../../lib/api";
import CinemaTrailCard from "../../components/recommendation/CinemaTrailCard";
import type { CinemaTrail } from "../../lib/types";

export default async function TrailsPage() {
  let trails: CinemaTrail[] = [];
  try {
    const data = await getTrails();
    trails = data?.trails || [];
  } catch (error) {
    console.error("Failed to load cinema trails:", error);
  }
  
  return (
    <main className="min-h-screen pt-24 pb-20 px-4 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Cinema Trails</h1>
      <p className="text-xl text-[var(--text-muted)] mb-12">
        Curated journeys through film history, genres, and movements.
      </p>
      
      {trails.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          No trails available at this moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trails.map((trail) => (
            <CinemaTrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      )}
    </main>
  );
}
