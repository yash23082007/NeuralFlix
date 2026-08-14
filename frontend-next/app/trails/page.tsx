import { getTrails } from "../../lib/api";
import CinemaTrailCard from "../../components/recommendation/CinemaTrailCard";

export default async function TrailsPage() {
  const { trails } = await getTrails();
  
  return (
    <main className="min-h-screen pt-24 pb-20 px-4 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Cinema Trails</h1>
      <p className="text-xl text-[var(--text-muted)] mb-12">
        Curated journeys through film history, genres, and movements.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {trails.map((trail) => (
          <CinemaTrailCard key={trail.id} trail={trail as never} />
        ))}
      </div>
    </main>
  );
}
