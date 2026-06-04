"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Award, Hourglass, Calendar, Compass, Sparkles } from "lucide-react";

interface TasteProfile {
  top_genres?: [string, number][];
  preferred_decades?: [string, number][];
  avg_runtime_preference?: number;
  language_preferences?: [string, number][];
  rating_threshold?: number;
  top_directors?: [string, number][];
}

interface TasteDNAProps {
  profile: TasteProfile | null;
  loading?: boolean;
}

export default function TasteDNA({ profile, loading }: TasteDNAProps) {
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const normalizeProfile = (raw: any): TasteProfile => {
    const toTuples = (obj: any): [string, number][] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      return Object.entries(obj).sort(([, a], [, b]) => (b as number) - (a as number)) as [string, number][];
    };
    return {
      top_genres: toTuples(raw?.top_genres),
      preferred_decades: toTuples(raw?.preferred_decades),
      top_directors: toTuples(raw?.top_directors),
      language_preferences: toTuples(raw?.language_preferences),
      avg_runtime_preference: raw?.avg_runtime_preference,
      rating_threshold: raw?.rating_threshold,
    };
  };

  const normalizedProfile = profile ? normalizeProfile(profile) : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30 backdrop-blur-sm relative overflow-hidden">
        <motion.div
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-[var(--accent-warm)]/10 to-transparent pointer-events-none"
        />
        <div className="relative flex items-center justify-center h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full bg-[var(--accent-warm)]/10" />
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-warm)]/10 border-t-[var(--accent-warm)] shadow-[0_0_15px_var(--accent-warm-glow)]" />
        </div>
        <p className="text-xs font-semibold tracking-wider text-[var(--accent-warm)] uppercase animate-pulse font-sans">
          Sequencing taste fingerprint...
        </p>
      </div>
    );
  }

  if (!normalizedProfile?.top_genres?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-center border border-[var(--border-subtle)] rounded-3xl p-8 bg-[var(--surface-elevated)]/20 backdrop-blur-sm">
        <Compass className="h-12 w-12 text-[var(--text-tertiary)] mb-4 opacity-50 animate-bounce" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider font-sans">
          Taste Profile Offline
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-xs leading-relaxed font-sans">
          Watch history logs are currently insufficient to map your Cinematic Fingerprint. Rate more movies in the catalog to sequence taste coordinates.
        </p>
      </div>
    );
  }

  const genres = normalizedProfile.top_genres.slice(0, 8);
  const n = genres.length;
  const maxCount = genres[0]?.[1] || 1;

  // Radar math
  const cx = 50;
  const cy = 50;
  const radius = 35;

  // Generate grid concentric polygons
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridPolygons = rings.map((ringFactor) => {
    const r = radius * ringFactor;
    const points: string[] = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  });

  // Generate radar axis lines
  const axes = Array.from({ length: n }).map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    return { x, y };
  });

  // Generate user data polygon
  const dataPoints = genres.map(([_, count], i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const normalized = count / maxCount;
    const r = radius * Math.max(0.15, normalized);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    return { x, y, genre: genres[i][0] };
  });

  const dataPolygonString = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[var(--surface-elevated)]/30 border border-[var(--border-subtle)] p-6 md:p-8 rounded-3xl backdrop-blur-md relative overflow-hidden">
      {/* Subtle diagnostic grids */}
      <div className="absolute top-0 right-0 w-[40%] h-[150%] pointer-events-none opacity-20 blur-[85px] bg-gradient-to-br from-[var(--accent-warm)] to-transparent" />

      {/* Visual Radar Column (Col Span 6) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col items-center">
        {/* Holographic Radar Scanner Container */}
        <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center">
          <svg className="w-full h-full drop-shadow-[0_0_24px_rgba(232,168,73,0.15)]" viewBox="0 0 100 100">
            {/* Inner Concentric Rings */}
            {gridPolygons.map((polygonStr, idx) => (
              <polygon
                key={idx}
                points={polygonStr}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="0.5"
              />
            ))}

            {/* Radar Axes */}
            {axes.map((axis, idx) => (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={axis.x}
                y2={axis.y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="0.5"
              />
            ))}

            {/* Radar Sweeping Scan Line */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="url(#scannerGlow)"
              strokeWidth="0.75"
              strokeDasharray="20 100"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              style={{ transformOrigin: "center" }}
            />

            {/* Glowing user Taste DNA polygon */}
            <motion.polygon
              points={dataPolygonString}
              fill="rgba(232, 168, 73, 0.08)"
              stroke="url(#tastePolyGradient)"
              strokeWidth="1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ transformOrigin: "center" }}
            />

            {/* Vertices Nodes */}
            {dataPoints.map((p, idx) => {
              const isHovered = activeGenre === p.genre;
              return (
                <g key={p.genre}>
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="2.5"
                      fill="var(--accent-warm)"
                      className="animate-ping opacity-75"
                    />
                  )}
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? "2" : "1.25"}
                    fill={isHovered ? "var(--accent-warm)" : "var(--accent-rose)"}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setActiveGenre(p.genre)}
                    onMouseLeave={() => setActiveGenre(null)}
                  />
                  {/* Labels on the outer ring coordinates */}
                  <text
                    x={cx + Math.cos((idx / n) * Math.PI * 2 - Math.PI / 2) * (radius + 6)}
                    y={cy + Math.sin((idx / n) * Math.PI * 2 - Math.PI / 2) * (radius + 6)}
                    fill={isHovered ? "var(--accent-warm)" : "var(--text-secondary)"}
                    fontSize="2.6"
                    fontFamily="var(--font-outfit), sans-serif"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="uppercase select-none cursor-pointer tracking-wider"
                    onMouseEnter={() => setActiveGenre(p.genre)}
                    onMouseLeave={() => setActiveGenre(null)}
                  >
                    {p.genre}
                  </text>
                </g>
              );
            })}

            {/* Gradients */}
            <defs>
              <linearGradient id="tastePolyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-warm)" />
                <stop offset="100%" stopColor="var(--accent-rose)" />
              </linearGradient>
              <linearGradient id="scannerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-warm)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--accent-rose)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner diagnosis telemetry metrics */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] tracking-widest uppercase font-sans">TASTE</span>
            <span className="text-[11px] text-[var(--accent-warm)] tracking-wider font-bold uppercase font-sans">GENETIC</span>
          </div>
        </div>
      </div>

      {/* Structured Telemetry Data Columns (Col Span 6) */}
      <div className="col-span-12 lg:col-span-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[var(--accent-warm)] animate-pulse" />
            <span className="text-[10px] font-semibold tracking-wider text-[var(--accent-warm)] uppercase font-sans">
              CINEMATIC PROFILE SEQUENCE
            </span>
          </div>

          <h3 className="text-2xl font-bold text-[var(--text-primary)] font-playfair leading-tight">
            Cinematic Taste DNA
          </h3>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)] font-sans">
            Visual representations derived from genre affinity calculations, director signatures, and release period metadata on your rated titles.
          </p>
        </div>

        {/* Dynamic Category Buttons */}
        <div className="flex flex-wrap gap-2">
          {genres.map(([genre, count]) => {
            const isHovered = activeGenre === genre;
            return (
              <button
                key={genre}
                onMouseEnter={() => setActiveGenre(genre)}
                onMouseLeave={() => setActiveGenre(null)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer font-sans ${
                  isHovered
                    ? "border-[var(--accent-warm)] bg-[var(--accent-warm)]/10 text-[var(--text-primary)] shadow-[0_0_12px_var(--accent-warm-glow)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isHovered ? "bg-[var(--accent-warm)] animate-ping" : "bg-[var(--accent-rose)]"}`} />
                {genre} · {count}
              </button>
            );
          })}
        </div>

        {/* Monospace telemetry badges row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-4">
          {/* Average Runtime */}
          {normalizedProfile.avg_runtime_preference && (
            <div className="bg-[var(--surface-overlay)]/40 border border-[var(--border-subtle)] rounded-2xl p-3 flex flex-col gap-1">
              <span className="text-[8px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider flex items-center gap-1 font-sans">
                <Hourglass className="h-2.5 w-2.5" /> RUNTIME PREF
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)] mt-1 font-sans">
                {normalizedProfile.avg_runtime_preference} MIN
              </span>
            </div>
          )}

          {/* Decades */}
          {normalizedProfile.preferred_decades && normalizedProfile.preferred_decades.length > 0 && (
            <div className="bg-[var(--surface-overlay)]/40 border border-[var(--border-subtle)] rounded-2xl p-3 flex flex-col gap-1">
              <span className="text-[8px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider flex items-center gap-1 font-sans">
                <Calendar className="h-2.5 w-2.5" /> DOMINANT ERAS
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate font-sans">
                {normalizedProfile.preferred_decades.map(([d]) => `${d}s`).slice(0, 2).join(" / ")}
              </span>
            </div>
          )}

          {/* Directors */}
          {normalizedProfile.top_directors && normalizedProfile.top_directors.length > 0 && (
            <div className="bg-[var(--surface-overlay)]/40 border border-[var(--border-subtle)] rounded-2xl p-3 flex flex-col gap-1 col-span-2 sm:col-span-1">
              <span className="text-[8px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider flex items-center gap-1 font-sans">
                <Award className="h-2.5 w-2.5" /> FAV AUTEURS
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate font-sans">
                {normalizedProfile.top_directors[0][0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
