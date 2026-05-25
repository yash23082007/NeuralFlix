"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useRouter } from "next/navigation";
import { Globe2, X, Star, ArrowRight, Film } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getByRegion, Movie } from "../lib/api";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const CINEMA_DATA: Record<string, { region: string; count: number; topMovie: string; color: string; hover: string; title: string }> = {
  IND: { region: "indian", title: "Indian Cinema", count: 12450, topMovie: "RRR", color: "var(--accent-india)", hover: "#ff8c61" },
  KOR: { region: "korean", title: "Korean Cinema", count: 2840, topMovie: "Parasite", color: "var(--accent-korea)", hover: "#74a8e6" },
  JPN: { region: "japanese", title: "Japanese Cinema", count: 4200, topMovie: "Spirited Away", color: "var(--accent-japan)", hover: "#d65345" },
  FRA: { region: "french", title: "French Cinema", count: 3100, topMovie: "Amelie", color: "var(--accent-france)", hover: "#8a7ceb" },
  USA: { region: "hollywood", title: "Hollywood", count: 45000, topMovie: "The Godfather", color: "var(--accent-hollywood)", hover: "#ecc26c" },
  ESP: { region: "spanish", title: "Spanish Cinema", count: 1800, topMovie: "Pan's Labyrinth", color: "#e67e22", hover: "#f39c12" },
  IRN: { region: "iranian", title: "Iranian Cinema", count: 450, topMovie: "A Separation", color: "#27ae60", hover: "#2ecc71" },
  NGA: { region: "nollywood", title: "Nollywood", count: 2100, topMovie: "The Black Book", color: "#f1c40f", hover: "#f39c12" },
};

export default function CinemaWorldMap() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; content: any } | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionMovies, setRegionMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedRegion) {
      setRegionMovies([]);
      return;
    }

    const fetchRegionMovies = async () => {
      setLoadingMovies(true);
      try {
        const movies = await getByRegion(selectedRegion);
        setRegionMovies(movies.slice(0, 5));
      } catch (error) {
        console.error("Failed to fetch movies for region:", selectedRegion, error);
      } finally {
        setLoadingMovies(false);
      }
    };

    fetchRegionMovies();
  }, [selectedRegion]);

  if (!mounted) return <div className="h-[560px] w-full rounded-lg border border-border bg-bg-elevated" />;

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-lg border border-border bg-surface/80 p-4 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-black text-text-primary">
          <Globe2 className="h-5 w-5 text-accent" />
          Regional signal map
        </h2>
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          Cinema clusters by origin market and language family. Click a region to inspect films.
        </p>
      </div>

      <ComposableMap
        projection="geoMercator"
        height={560}
        projectionConfig={{ scale: 120, center: [0, 30] }}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = geo.id;
                const cinemaInfo = CINEMA_DATA[countryId];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    fill={cinemaInfo ? cinemaInfo.color : "var(--bg-elevated)"}
                    style={{
                      default: { outline: "none", transition: "all 220ms ease" },
                      hover: {
                        fill: cinemaInfo ? cinemaInfo.hover : "var(--bg-surface)",
                        outline: "none",
                        cursor: cinemaInfo ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(event) => {
                      if (cinemaInfo) {
                        setTooltipData({
                          x: event.clientX,
                          y: event.clientY,
                          content: { name: geo.properties.name, ...cinemaInfo },
                        });
                      }
                    }}
                    onMouseMove={(event) => {
                      if (cinemaInfo && tooltipData) {
                        setTooltipData({ ...tooltipData, x: event.clientX, y: event.clientY });
                      }
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                    onClick={() => {
                      if (cinemaInfo) {
                        setSelectedRegion(cinemaInfo.region);
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltipData && (
        <div
          className="pointer-events-none fixed z-[90] rounded-lg border border-border bg-white/95 px-4 py-3 text-text-primary shadow-card backdrop-blur"
          style={{ top: tooltipData.y + 15, left: tooltipData.x + 15 }}
        >
          <div className="mb-1 flex items-center justify-between gap-3 text-base font-black">
            {tooltipData.content.name}
            <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-bold uppercase text-text-muted">
              {tooltipData.content.region}
            </span>
          </div>
          <div className="text-sm text-text-muted">
            <span className="font-black text-accent">{tooltipData.content.count.toLocaleString()}</span> titles indexed
          </div>
          <div className="mt-1 border-t border-border pt-1 text-sm text-text-muted">
            Anchor: <span className="text-text-primary">{tooltipData.content.topMovie}</span>
          </div>
        </div>
      )}

      {/* Drill-down Sidebar */}
      <AnimatePresence>
        {selectedRegion && (() => {
          const regionKey = Object.keys(CINEMA_DATA).find(
            (k) => CINEMA_DATA[k].region === selectedRegion
          );
          const info = regionKey ? CINEMA_DATA[regionKey] : null;
          if (!info) return null;

          return (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 border-l border-border bg-surface/90 p-5 shadow-2xl backdrop-blur-md z-20 flex flex-col justify-between"
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-lg font-black text-text-primary">{info.title}</h3>
                    <p className="text-xs text-text-muted">{info.count.toLocaleString()} titles indexed</p>
                  </div>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-elevated text-text-muted hover:text-text-primary transition-all cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Movie List */}
                <div className="mt-5 space-y-3 overflow-y-auto max-h-[360px] no-scrollbar">
                  <h4 className="text-[10px] font-mono tracking-widest text-accent uppercase font-black">
                    TOP REGIONAL PICKS
                  </h4>

                  {loadingMovies ? (
                    // Skeleton shimmer
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="flex gap-3 p-2 rounded-xl border border-border/40 bg-surface/50 animate-pulse">
                        <div className="w-12 h-16 bg-bg-elevated rounded-lg" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3 bg-bg-elevated rounded w-3/4" />
                          <div className="h-2 bg-bg-elevated rounded w-1/2" />
                        </div>
                      </div>
                    ))
                  ) : regionMovies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted">
                      <Film className="h-6 w-6 opacity-30 mb-2" />
                      <p className="text-xs">No active releases mapped for region</p>
                    </div>
                  ) : (
                    regionMovies.map((movie) => (
                      <div
                        key={movie.tmdb_id || movie._id}
                        onClick={() => router.push(`/movie/${movie.tmdb_id || movie._id}`)}
                        className="flex gap-3 p-2 rounded-xl border border-border/40 bg-surface/50 hover:bg-surface-hover hover:border-accent/40 cursor-pointer transition-all duration-200 group"
                      >
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-12 h-16 object-cover rounded-lg shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-bg-elevated rounded-lg flex items-center justify-center text-[10px] text-text-muted">
                            No Poster
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h5 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                            {movie.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                            <span>{movie.year || "N/A"}</span>
                            <span>·</span>
                            <div className="flex items-center text-[var(--rating-gold)]">
                              <Star className="h-3 w-3 mr-0.5 fill-current" />
                              {movie.rating ? movie.rating.toFixed(1) : "0.0"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Call */}
              <button
                onClick={() => router.push(`/cinema?region=${selectedRegion}`)}
                className="w-full bg-accent hover:brightness-110 active:scale-[0.98] text-black font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-glow text-sm"
              >
                Explore All {info.title}
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
