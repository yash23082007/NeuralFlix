import { notFound } from "next/navigation";
import Link from "next/link";
import { BarChart3, Clapperboard, Compass, Users } from "lucide-react";
import MovieCard from "../../../components/MovieCard";
import { Movie } from "../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const REGION_MAP: Record<
  string,
  {
    title: string;
    subtitle: string;
    code: string;
    accent: string;
    movement?: string;
    directors?: string[];
    anchors?: string[];
  }
> = {
  indian: {
    title: "Indian Cinema",
    subtitle: "Multi-language cinema spanning national and regional industries.",
    code: "IN",
    accent: "#FF6B35",
    movement: "Parallel cinema and contemporary pan-India blockbusters.",
    directors: ["Satyajit Ray", "S. S. Rajamouli", "Mani Ratnam", "Anurag Kashyap"],
    anchors: ["Pather Panchali", "RRR", "Sholay", "The Lunchbox"],
  },
  bollywood: {
    title: "Bollywood",
    subtitle: "Hindi cinema with high-volume musical, drama, and thriller output.",
    code: "HI",
    accent: "#FF6B35",
    directors: ["Zoya Akhtar", "Rajkumar Hirani", "Sanjay Leela Bhansali", "Anurag Kashyap"],
    anchors: ["Sholay", "3 Idiots", "Dangal", "My Name Is Khan"],
  },
  tollywood: {
    title: "Tollywood",
    subtitle: "Telugu cinema with strong action, spectacle, and folklore signals.",
    code: "TE",
    accent: "#F39C12",
    directors: ["S. S. Rajamouli", "Sukumar", "Trivikram", "Sekhar Kammula"],
    anchors: ["RRR", "Baahubali", "Pushpa", "Eega"],
  },
  korean: {
    title: "Korean Cinema",
    subtitle: "Thrillers, class dramas, horror, and tightly engineered genre hybrids.",
    code: "KR",
    accent: "#4A90D9",
    movement: "Korean New Wave and international festival breakthrough.",
    directors: ["Bong Joon Ho", "Park Chan-wook", "Lee Chang-dong", "Kim Jee-woon"],
    anchors: ["Parasite", "Oldboy", "Memories of Murder", "The Handmaiden"],
  },
  japanese: {
    title: "Japanese Cinema",
    subtitle: "Animation, samurai cinema, family fantasy, and modern drama.",
    code: "JP",
    accent: "#C0392B",
    movement: "Golden Age classics and globally dominant animation.",
    directors: ["Akira Kurosawa", "Hayao Miyazaki", "Hirokazu Kore-eda", "Makoto Shinkai"],
    anchors: ["Spirited Away", "Your Name.", "Seven Samurai", "Tokyo Story"],
  },
  french: {
    title: "French Cinema",
    subtitle: "Romance, comedy, auteur drama, and New Wave influence.",
    code: "FR",
    accent: "#6C5CE7",
    movement: "French New Wave and modern art-house cinema.",
    directors: ["Agnes Varda", "Francois Truffaut", "Jean-Luc Godard", "Celine Sciamma"],
    anchors: ["Amelie", "The Intouchables", "Breathless", "Portrait of a Lady on Fire"],
  },
  spanish: {
    title: "Spanish-Language Cinema",
    subtitle: "Spain and Latin America across fantasy, realism, and political drama.",
    code: "ES",
    accent: "#E67E22",
    directors: ["Pedro Almodovar", "Alfonso Cuaron", "Guillermo del Toro", "Alejandro G. Inarritu"],
    anchors: ["Pan's Labyrinth", "Roma", "Y Tu Mama Tambien", "The Secret in Their Eyes"],
  },
  iranian: {
    title: "Iranian Cinema",
    subtitle: "Humanist realism, social drama, and festival-proven storytelling.",
    code: "IR",
    accent: "#27AE60",
    directors: ["Asghar Farhadi", "Abbas Kiarostami", "Jafar Panahi", "Majid Majidi"],
    anchors: ["A Separation", "Close-Up", "Children of Heaven", "The Salesman"],
  },
  hollywood: {
    title: "Hollywood",
    subtitle: "Large-scale franchise, auteur, and studio filmmaking.",
    code: "US",
    accent: "#F5A623",
    directors: ["Christopher Nolan", "Steven Spielberg", "Martin Scorsese", "Greta Gerwig"],
    anchors: ["The Godfather", "Inception", "Oppenheimer", "The Avengers"],
  },
  nollywood: {
    title: "Nollywood",
    subtitle: "Nigeria's high-output film industry and streaming-era expansion.",
    code: "NG",
    accent: "#F39C12",
    anchors: ["The Black Book", "Lionheart", "October 1", "Living in Bondage"],
  },
};

async function getMoviesByRegion(region: string, page = 1) {
  try {
    const res = await fetch(`${API_BASE}/api/movies/region/${region}?page=${page}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch region movies:", error);
    return null;
  }
}

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const regionKey = region.toLowerCase();
  const regionConfig = REGION_MAP[regionKey];

  if (!regionConfig) notFound();

  const data = await getMoviesByRegion(regionKey);
  const movies: Movie[] = data?.results || [];

  return (
    <main className="min-h-screen bg-background pt-24 page-enter">
      <section
        className="border-b border-border"
        style={{
          background: `linear-gradient(135deg, ${regionConfig.accent}22 0%, transparent 55%)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="inline-flex rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-black text-text-muted">
                {regionConfig.code}
              </span>
              <h1 className="mt-4 text-4xl font-black text-text-primary md:text-6xl">{regionConfig.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">{regionConfig.subtitle}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-surface p-3 shadow-card">
                <Clapperboard className="mx-auto h-4 w-4 text-accent" />
                <div className="mt-2 text-lg font-black text-text-primary">{movies.length}</div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Titles</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3 shadow-card">
                <Users className="mx-auto h-4 w-4 text-accent" />
                <div className="mt-2 text-lg font-black text-text-primary">{regionConfig.directors?.length || 0}</div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Directors</p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3 shadow-card">
                <BarChart3 className="mx-auto h-4 w-4 text-accent" />
                <div className="mt-2 text-lg font-black text-text-primary">ML</div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Cluster</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 md:px-6">
        {regionConfig.movement && (
          <div className="rounded-lg border border-border border-l-4 bg-surface p-5 shadow-card" style={{ borderLeftColor: regionConfig.accent }}>
            <h2 className="text-lg font-black text-text-primary">{regionConfig.movement}</h2>
          </div>
        )}

        {regionConfig.directors && (
          <section>
            <h2 className="section-heading mb-4">Director signals</h2>
            <div className="flex flex-wrap gap-3">
              {regionConfig.directors.map((director) => (
                <span key={director} className="genre-pill">
                  {director}
                </span>
              ))}
            </div>
          </section>
        )}

        {regionConfig.anchors && (
          <section>
            <h2 className="section-heading mb-4">Anchor titles</h2>
            <div className="flex flex-wrap gap-3">
              {regionConfig.anchors.map((film) => (
                <span key={film} className="genre-pill">
                  {film}
                </span>
              ))}
            </div>
          </section>
        )}

        {regionKey === "indian" && (
          <section>
            <h2 className="section-heading mb-4">Industry clusters</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {["bollywood", "tollywood", "korean", "japanese"].map((key) => {
                const cfg = REGION_MAP[key];
                return (
                  <Link
                    key={key}
                    href={`/cinema/${key}`}
                    className="rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:bg-bg-elevated"
                  >
                    <Compass className="mb-4 h-5 w-5 text-accent" />
                    <h3 className="text-sm font-black text-text-primary">{cfg.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-text-muted">{cfg.subtitle}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-heading">Top candidates</h2>
            <span className="text-sm font-bold text-text-muted">{movies.length} titles</span>
          </div>

          {movies.length > 0 ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {movies.map((movie) => (
                <MovieCard key={movie.tmdb_id || movie._id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface py-20 text-center">
              <Clapperboard className="mx-auto mb-4 h-10 w-10 text-text-muted" />
              <h3 className="text-xl font-black text-text-primary">No regional candidates loaded</h3>
              <p className="mt-2 text-sm text-text-muted">The fallback catalog will appear when the backend is running.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
