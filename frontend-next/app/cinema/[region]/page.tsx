"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Clapperboard, Compass, Users, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MovieCard from "../../../components/MovieCard";
import RowSkeleton from "../../../components/RowSkeleton";
import ScrollReveal from "../../../components/ScrollReveal";
import { Movie } from "../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const REGION_MAP: Record<
  string,
  {
    title: string;
    subtitle: string;
    code: string;
    accent: string;
    accentGlow: string;
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
    accentGlow: "rgba(255, 107, 53, 0.15)",
    movement: "Parallel cinema and contemporary pan-India blockbusters.",
    directors: ["Satyajit Ray", "S. S. Rajamouli", "Mani Ratnam", "Anurag Kashyap"],
    anchors: ["Pather Panchali", "RRR", "Sholay", "The Lunchbox"],
  },
  bollywood: {
    title: "Bollywood",
    subtitle: "Hindi cinema with high-volume musical, drama, and thriller output.",
    code: "HI",
    accent: "#FF6B35",
    accentGlow: "rgba(255, 107, 53, 0.15)",
    directors: ["Zoya Akhtar", "Rajkumar Hirani", "Sanjay Leela Bhansali", "Anurag Kashyap"],
    anchors: ["Sholay", "3 Idiots", "Dangal", "My Name Is Khan"],
  },
  tollywood: {
    title: "Tollywood",
    subtitle: "Telugu cinema with strong action, spectacle, and folklore signals.",
    code: "TE",
    accent: "#F39C12",
    accentGlow: "rgba(243, 156, 18, 0.15)",
    directors: ["S. S. Rajamouli", "Sukumar", "Trivikram", "Sekhar Kammula"],
    anchors: ["RRR", "Baahubali", "Pushpa", "Eega"],
  },
  korean: {
    title: "Korean Cinema",
    subtitle: "Thrillers, class dramas, horror, and tightly engineered genre hybrids.",
    code: "KR",
    accent: "#4A90D9",
    accentGlow: "rgba(74, 144, 217, 0.15)",
    movement: "Korean New Wave and international festival breakthrough.",
    directors: ["Bong Joon Ho", "Park Chan-wook", "Lee Chang-dong", "Kim Jee-woon"],
    anchors: ["Parasite", "Oldboy", "Memories of Murder", "The Handmaiden"],
  },
  japanese: {
    title: "Japanese Cinema",
    subtitle: "Animation, samurai cinema, family fantasy, and modern drama.",
    code: "JP",
    accent: "#C0392B",
    accentGlow: "rgba(192, 57, 43, 0.15)",
    movement: "Golden Age classics and globally dominant animation.",
    directors: ["Akira Kurosawa", "Hayao Miyazaki", "Hirokazu Kore-eda", "Makoto Shinkai"],
    anchors: ["Spirited Away", "Your Name.", "Seven Samurai", "Tokyo Story"],
  },
  french: {
    title: "French Cinema",
    subtitle: "Romance, comedy, auteur drama, and New Wave influence.",
    code: "FR",
    accent: "#6C5CE7",
    accentGlow: "rgba(108, 92, 231, 0.15)",
    movement: "French New Wave and modern art-house cinema.",
    directors: ["Agnes Varda", "Francois Truffaut", "Jean-Luc Godard", "Celine Sciamma"],
    anchors: ["Amelie", "The Intouchables", "Breathless", "Portrait of a Lady on Fire"],
  },
  spanish: {
    title: "Spanish-Language Cinema",
    subtitle: "Spain and Latin America across fantasy, realism, and political drama.",
    code: "ES",
    accent: "#E67E22",
    accentGlow: "rgba(230, 126, 34, 0.15)",
    directors: ["Pedro Almodovar", "Alfonso Cuaron", "Guillermo del Toro", "Alejandro G. Inarritu"],
    anchors: ["Pan's Labyrinth", "Roma", "Y Tu Mama Tambien", "The Secret in Their Eyes"],
  },
  iranian: {
    title: "Iranian Cinema",
    subtitle: "Humanist realism, social drama, and festival-proven storytelling.",
    code: "IR",
    accent: "#27AE60",
    accentGlow: "rgba(39, 174, 96, 0.15)",
    directors: ["Asghar Farhadi", "Abbas Kiarostami", "Jafar Panahi", "Majid Majidi"],
    anchors: ["A Separation", "Close-Up", "Children of Heaven", "The Salesman"],
  },
  hollywood: {
    title: "Hollywood",
    subtitle: "Large-scale franchise, auteur, and studio filmmaking.",
    code: "US",
    accent: "#F5A623",
    accentGlow: "rgba(245, 166, 35, 0.15)",
    directors: ["Christopher Nolan", "Steven Spielberg", "Martin Scorsese", "Greta Gerwig"],
    anchors: ["The Godfather", "Inception", "Oppenheimer", "The Avengers"],
  },
  nollywood: {
    title: "Nollywood",
    subtitle: "Nigeria's high-output film industry and streaming-era expansion.",
    code: "NG",
    accent: "#F39C12",
    accentGlow: "rgba(243, 156, 18, 0.15)",
    anchors: ["The Black Book", "Lionheart", "October 1", "Living in Bondage"],
  },
};

export default function RegionPage() {
  const { region } = useParams() as { region: string };
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const regionKey = region ? region.toLowerCase() : "";
  const regionConfig = REGION_MAP[regionKey];

  useEffect(() => {
    if (!regionConfig) {
      return;
    }

    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/movies/region/${regionKey}?page=${page}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.results || []);
          setTotalPages(data.total_pages || 1);
        }
      } catch (error) {
        console.error("Failed to fetch region movies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [regionKey, page, regionConfig]);

  if (!regionConfig) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-primary)] px-4">
        <h1 className="text-3xl font-bold font-playfair text-[var(--text-primary)]">Region Not Found</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2 font-sans">
          The requested cinema region is not catalogued in our database.
        </p>
        <Link
          href="/"
          className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] transition-all font-sans"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
  };

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] pb-24">
      {/* Header section with region-specific glow */}
      <div className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 pt-28 pb-14">
        <div 
          className="absolute top-0 right-0 w-[40%] h-[150%] pointer-events-none opacity-40 blur-[80px]"
          style={{
            background: `radial-gradient(circle, ${regionConfig.accent}1c 0%, transparent 70%)`
          }}
        />

        <div className="mx-auto max-w-7xl px-6 md:px-8 relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors duration-150 font-sans"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </button>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4 max-w-3xl">
              <span 
                className="inline-flex rounded-full border px-3.5 py-1 text-xs font-bold font-sans transition-all shadow-sm"
                style={{ 
                  color: regionConfig.accent, 
                  borderColor: `${regionConfig.accent}33`,
                  backgroundColor: `${regionConfig.accent}11`,
                  boxShadow: `0 0 12px ${regionConfig.accentGlow}`
                }}
              >
                {regionConfig.code} Cinema Cluster
              </span>
              <h1 className="text-4xl font-extrabold text-[var(--text-primary)] md:text-6xl font-playfair tracking-tight">
                {regionConfig.title}
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-[var(--text-secondary)] font-sans">
                {regionConfig.subtitle}
              </p>
            </div>

            <div className="flex gap-4">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-5 py-4 min-w-[90px] text-center shadow-lg backdrop-blur-sm">
                <Clapperboard className="mx-auto h-5 w-5" style={{ color: regionConfig.accent }} />
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)] font-sans">
                  {movies.length || "—"}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">Titles</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-5 py-4 min-w-[90px] text-center shadow-lg backdrop-blur-sm">
                <Users className="mx-auto h-5 w-5" style={{ color: regionConfig.accent }} />
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)] font-sans">
                  {regionConfig.directors?.length || 0}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">Directors</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-5 py-4 min-w-[90px] text-center shadow-lg backdrop-blur-sm">
                <BarChart3 className="mx-auto h-5 w-5" style={{ color: regionConfig.accent }} />
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)] font-sans">ML</div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">Cluster</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-6 md:px-8 mt-12 space-y-12">
        {/* Movements & Signals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {regionConfig.movement && (
            <ScrollReveal className="md:col-span-3">
              <div 
                className="rounded-2xl border border-[var(--border-subtle)] p-6 backdrop-blur-sm relative overflow-hidden"
                style={{ 
                  borderLeft: `4px solid ${regionConfig.accent}`,
                  background: `linear-gradient(90deg, ${regionConfig.accent}05 0%, transparent 100%)`
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] font-sans block mb-1">
                  Cinematic Movement / Theme
                </span>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] font-sans">
                  {regionConfig.movement}
                </h2>
              </div>
            </ScrollReveal>
          )}

          {regionConfig.directors && (
            <ScrollReveal className={regionConfig.anchors ? "md:col-span-1" : "md:col-span-3"}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm h-full">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] font-sans mb-4">
                  Key Director Signals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {regionConfig.directors.map((director) => (
                    <span 
                      key={director} 
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)] transition-all font-sans"
                    >
                      {director}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}

          {regionConfig.anchors && (
            <ScrollReveal className={regionConfig.directors ? "md:col-span-2" : "md:col-span-3"}>
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 p-6 backdrop-blur-sm h-full">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] font-sans mb-4">
                  Anchor Masterpieces
                </h3>
                <div className="flex flex-wrap gap-2">
                  {regionConfig.anchors.map((film) => (
                    <span 
                      key={film} 
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--text-secondary)] transition-all font-sans"
                    >
                      {film}
                    </span>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>

        {/* Global Cinema Link if Indian cluster */}
        {regionKey === "indian" && (
          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)] font-playfair tracking-wide">
                Explore Sub-industries
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {["bollywood", "tollywood", "korean"].map((key) => {
                  const cfg = REGION_MAP[key];
                  if (!cfg) return null;
                  return (
                    <Link
                      key={key}
                      href={`/cinema/${key}`}
                      className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 p-5 shadow-md hover:shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] flex flex-col justify-between"
                    >
                      <div>
                        <Compass className="mb-4 h-5 w-5 text-[var(--accent-warm)] transition-transform duration-300 group-hover:rotate-45" />
                        <h3 className="text-base font-bold text-[var(--text-primary)] font-sans group-hover:text-[var(--accent-warm)] transition-colors">
                          {cfg.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed font-sans line-clamp-2">
                          {cfg.subtitle}
                        </p>
                      </div>
                      <span className="mt-4 text-xs font-bold text-[var(--accent-warm)] font-sans group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Explore Cluster →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Movies Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-playfair">
              Top Catalog Candidates
            </h2>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-sans">
              {movies.length} {movies.length === 1 ? "Film" : "Films"} catalogued
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-[var(--surface-muted)] h-[300px] rounded-xl" />
                ))}
              </div>
            ) : movies.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                {movies.map((movie) => (
                  <motion.div key={movie.tmdb_id || movie._id} variants={cardVariants}>
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 py-20 text-center backdrop-blur-sm">
                <Clapperboard className="mx-auto mb-4 h-12 w-12 text-[var(--text-tertiary)] animate-pulse" />
                <h3 className="text-lg font-bold text-[var(--text-primary)] font-sans">No candidates found</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-md mx-auto font-sans">
                  The local database cluster for {regionConfig.title} is empty or currently synchronization with the backend is disconnected.
                </p>
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
