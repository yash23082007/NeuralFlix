"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Film, Globe2, ArrowLeft } from "lucide-react";
import MovieCard from "../../../components/movie/MovieCard";
import { Movie } from "../../../lib/types";

const REGION_MAP: Record<string, { title: string; language: string; flag: string; description: string }> = {
  indian: { title: "Indian Cinema", language: "hi", flag: "🇮🇳", description: "Rich storytelling from the vibrant Indian film landscape." },
  bollywood: { title: "Bollywood Cinema", language: "hi", flag: "🇮🇳", description: "Iconic Hindi musical epics, intense dramas, and beloved romances." },
  tollywood: { title: "Tollywood Cinema", language: "te", flag: "🇮🇳", description: "High-octane Telugu blockbusters and visionary mythologies." },
  tamil: { title: "Tamil Cinema (Kollywood)", language: "ta", flag: "🇮🇳", description: "Pathbreaking narratives, realistic masterworks, and grand epics." },
  korean: { title: "Korean Cinema (Hallyuwood)", language: "ko", flag: "🇰🇷", description: "Masterful thrillers, poignant dramas, and cutting-edge cinema." },
  japanese: { title: "Japanese Cinema", language: "ja", flag: "🇯🇵", description: "Auteur storytelling, anime epics, and classic meditative cinema." },
  french: { title: "French Cinema", language: "fr", flag: "🇫🇷", description: "Avant-garde narratives, romantic realism, and New Wave legacy." },
  hollywood: { title: "Hollywood Cinema", language: "en", flag: "🇺🇸", description: "Global blockbuster productions and acclaimed modern classics." },
  spanish: { title: "Spanish & Latin Cinema", language: "es", flag: "🇪🇸", description: "Passionate storytelling, magical realism, and intense psychological thrillers." },
  nollywood: { title: "Nollywood Cinema", language: "en", flag: "🇳🇬", description: "Vibrant and prolific African storytelling with authentic cultural depth." },
  iranian: { title: "Iranian Cinema", language: "fa", flag: "🇮🇷", description: "Poetic realism, moral complexity, and globally lauded festival treasures." },
};

export default function CinemaRegionPage({ params }: { params: Promise<{ region: string }> }) {
  const resolvedParams = use(params);
  const regionSlug = resolvedParams.region.toLowerCase();
  const regionInfo = REGION_MAP[regionSlug] || {
    title: `${regionSlug.charAt(0).toUpperCase() + regionSlug.slice(1)} Cinema`,
    language: "en",
    flag: "🌍",
    description: `Explore world cinema selections from ${regionSlug}.`
  };

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRegionMovies() {
      setLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/v1/movies/trending`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.results || []);
        }
      } catch (err) {
        console.error("Failed to load regional cinema:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRegionMovies();
  }, [regionSlug]);

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] pt-28 pb-20 px-4 md:px-8 xl:px-12 max-w-7xl mx-auto space-y-10">
      <div className="flex items-center gap-2">
        <Link href="/discover" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Discover
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 p-8 md:p-12 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold uppercase tracking-wider">
            <Globe2 className="w-3.5 h-3.5" />
            Regional Cinema Lens • {regionInfo.flag}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            {regionInfo.title}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {regionInfo.description}
          </p>
        </div>
      </div>

      {/* Movie Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" /> Curated Selections
          </h2>
          <span className="text-xs text-muted-foreground font-mono">{movies.length} titles available</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton aspect-[2/3] rounded-2xl" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.tmdb_id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
            <Compass className="mx-auto h-12 w-12 text-white/30 mb-3" />
            <h3 className="text-lg font-semibold text-white">No regional titles indexed yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Check back soon as our global cinema crawler expands indexing.</p>
          </div>
        )}
      </div>
    </main>
  );
}
