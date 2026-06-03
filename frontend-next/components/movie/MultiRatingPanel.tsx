"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, Award, TrendingUp, Cpu, Gauge } from "lucide-react";
import { motion } from "framer-motion";
import { getAggregatedRatings, type AggregatedRatings } from "../../lib/api";

/**
 * Reconstructed Multi-Source Rating Panel.
 * Renders Metacritic, IMDb, RT, and TMDB readouts with modern cinematic styling
 * alongside a high-fidelity weighted NeuralFlix composite dial.
 */
export default function MultiRatingPanel({
  tmdbId,
  imdbId,
  mediaType = "movie",
}: {
  tmdbId: number;
  imdbId?: string;
  mediaType?: string;
}) {
  const [data, setData] = useState<AggregatedRatings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getAggregatedRatings(tmdbId, imdbId, mediaType);
        setData(result);
      } catch (err) {
        console.error("Error loading aggregated ratings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tmdbId, imdbId, mediaType]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-[var(--surface-muted)] h-20 w-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data || data.total_sources === 0) return null;

  const ratings = data.ratings;

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-[var(--accent-warm)] uppercase font-sans">
          <Gauge className="h-3.5 w-3.5 animate-pulse" />
          Ratings Telemetry Matrix
        </div>
        <span className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
          Sources Synced: {data.total_sources}
        </span>
      </div>

      {/* Rating Cards Grid */}
      <div className="flex flex-wrap gap-4">
        {/* IMDb */}
        {ratings.imdb && (
          <motion.div
            whileHover={{ scale: 1.03, borderColor: "rgba(245, 197, 24, 0.35)" }}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-4 py-3.5 transition-all shadow-md backdrop-blur-sm cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5C518] shadow-[0_0_12px_rgba(245,197,24,0.25)] text-black">
              <span className="text-[10px] font-black font-sans tracking-tighter">IMDb</span>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-sans">
                {ratings.imdb.label}
                <span className="text-xs font-normal text-[var(--text-tertiary)] ml-0.5">/10</span>
              </div>
              {ratings.imdb.votes != null && ratings.imdb.votes > 0 ? (
                <p className="text-[9px] font-medium uppercase text-[var(--text-tertiary)] mt-0.5 font-sans">
                  {(ratings.imdb.votes / 1000).toFixed(0)}k votes
                </p>
              ) : (
                <p className="text-[9px] font-medium uppercase text-[var(--text-tertiary)] mt-0.5 font-sans">Verified</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Rotten Tomatoes */}
        {ratings.rotten_tomatoes && (
          <motion.div
            whileHover={{ scale: 1.03, borderColor: "rgba(250, 50, 10, 0.35)" }}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-4 py-3.5 transition-all shadow-md backdrop-blur-sm cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FA320A] shadow-[0_0_12px_rgba(250,50,10,0.25)]">
              <span className="text-lg leading-none">
                {ratings.rotten_tomatoes.sentiment === "fresh" ? "🍅" : "🤢"}
              </span>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-sans">
                {ratings.rotten_tomatoes.label}
              </div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5 font-sans">
                {ratings.rotten_tomatoes.sentiment === "fresh" ? "Cert. Fresh" : "Rotten"}
              </p>
            </div>
          </motion.div>
        )}

        {/* Metacritic */}
        {ratings.metacritic && (
          <motion.div
            whileHover={{ scale: 1.03, borderColor: `${ratings.metacritic.color}55` }}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-4 py-3.5 transition-all shadow-md backdrop-blur-sm cursor-pointer"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold"
              style={{
                backgroundColor: ratings.metacritic.color,
                boxShadow: `0 0 12px ${ratings.metacritic.color}25`,
              }}
            >
              <span className="text-[11px] font-black font-sans">MC</span>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-sans">
                {ratings.metacritic.label}
                <span className="text-xs font-normal text-[var(--text-tertiary)] ml-0.5">/100</span>
              </div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5 font-sans">
                Metascore
              </p>
            </div>
          </motion.div>
        )}

        {/* TMDB */}
        {ratings.tmdb && (
          <motion.div
            whileHover={{ scale: 1.03, borderColor: "rgba(1, 210, 119, 0.35)" }}
            className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-4 py-3.5 transition-all shadow-md backdrop-blur-sm cursor-pointer"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#01D277] shadow-[0_0_12px_rgba(1,210,119,0.25)] text-white">
              <Star className="h-4 w-4 fill-white text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-[var(--text-primary)] font-sans">
                {ratings.tmdb.label}
                <span className="text-xs font-normal text-[var(--text-tertiary)] ml-0.5">/10</span>
              </div>
              <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] mt-0.5 font-sans">
                TMDB Score
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Composite Score cockpit dashboard */}
      {data.composite_score > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 p-6 flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm shadow-xl"
        >
          {/* Subtle light mesh */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_6px]" />

          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            {/* Circular dials */}
            <svg className="absolute h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="1.5"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgba(255,255,255,0.01)"
                strokeWidth="0.5"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="2.5"
                strokeDasharray={`${data.composite_score} ${100 - data.composite_score}`}
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${data.composite_score} ${100 - data.composite_score}` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  stroke:
                    data.composite_score >= 75
                      ? "var(--accent-warm)"
                      : data.composite_score >= 50
                      ? "var(--accent-rose)"
                      : "var(--accent-rose-dim)",
                  filter: `drop-shadow(0 0 4px ${
                    data.composite_score >= 75
                      ? "var(--accent-warm-glow)"
                      : "var(--accent-rose-glow)"
                  })`,
                }}
              />
            </svg>
            <span className="text-xl font-bold font-sans text-[var(--text-primary)]">
              {Math.round(data.composite_score)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--accent-warm)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-warm)] font-sans">
                NeuralFlix Hybrid Index
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
              Weighted composite rating algorithm calculated dynamically across database indices and voter clusters.
            </p>
          </div>

          {/* Awards & Box Office telemetry chips */}
          <div className="md:ml-auto flex flex-wrap items-center gap-2.5 z-10">
            {data.awards && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-3.5 py-2 text-[10px] font-semibold text-[var(--text-primary)] hover:border-[var(--accent-warm)]/30 transition-all font-sans">
                <Award className="h-3.5 w-3.5 text-[#F5C518] animate-pulse" />
                <span className="max-w-[200px] truncate uppercase tracking-wider">
                  {data.awards}
                </span>
              </div>
            )}
            {data.box_office && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-3.5 py-2 text-[10px] font-semibold text-[var(--text-primary)] hover:border-[var(--accent-warm)]/30 transition-all font-sans">
                <ThumbsUp className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                <span className="uppercase tracking-wider">
                  {data.box_office}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
