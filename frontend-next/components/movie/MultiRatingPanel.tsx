"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, Award, TrendingUp, Cpu, Gauge } from "lucide-react";
import { motion } from "framer-motion";
import { getAggregatedRatings, type AggregatedRatings } from "../../lib/api";

/**
 * Reconstructed Multi-Source Rating Panel — Elite Cockpit HUD Style.
 * Renders Metacritic, IMDb, RT, and TMDB readouts with telemetry styling
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
      const result = await getAggregatedRatings(tmdbId, imdbId, mediaType);
      setData(result);
      setLoading(false);
    }
    load();
  }, [tmdbId, imdbId, mediaType]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20 w-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data || data.total_sources === 0) return null;

  const ratings = data.ratings;

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#00dce5] font-black uppercase">
          <Gauge className="h-3.5 w-3.5" />
          RATINGS CONSOLE MATRIX
        </div>
        <span className="text-[9px] font-mono text-[#70707f]">[SOURCES ONLINE: {data.total_sources}]</span>
      </div>

      {/* Rating Cards Grid */}
      <div className="flex flex-wrap gap-4">
        {/* IMDb */}
        {ratings.imdb && (
          <motion.div 
            whileHover={{ scale: 1.02, borderColor: "rgba(245, 197, 24, 0.4)" }}
            className="group flex items-center gap-3 rounded-2xl border border-[#F5C518]/10 bg-[#0c0c10]/60 px-4 py-3 transition-all cursor-crosshair"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5C518] shadow-[0_0_15px_rgba(245,197,24,0.2)]">
              <span className="text-[11px] font-black text-black font-mono">IMDb</span>
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white font-mono">
                {ratings.imdb.label}
                <span className="text-xs font-normal text-[#70707f]">/10</span>
              </div>
              {ratings.imdb.votes != null && ratings.imdb.votes > 0 ? (
                <p className="text-[9px] font-mono uppercase text-[#70707f] mt-0.5">
                  {(ratings.imdb.votes / 1000).toFixed(0)}K VOXELS
                </p>
              ) : (
                <p className="text-[9px] font-mono uppercase text-[#70707f] mt-0.5">METRIC OK</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Rotten Tomatoes */}
        {ratings.rotten_tomatoes && (
          <motion.div 
            whileHover={{ scale: 1.02, borderColor: "rgba(250, 50, 10, 0.4)" }}
            className="group flex items-center gap-3 rounded-2xl border border-[#FA320A]/10 bg-[#0c0c10]/60 px-4 py-3 transition-all cursor-crosshair"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FA320A] shadow-[0_0_15px_rgba(250,50,10,0.2)]">
              <span className="text-lg leading-none">
                {ratings.rotten_tomatoes.sentiment === "fresh" ? "🍅" : "🤢"}
              </span>
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white font-mono">
                {ratings.rotten_tomatoes.label}
              </div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#70707f] mt-0.5">
                {ratings.rotten_tomatoes.sentiment === "fresh"
                  ? "CERT FRESH"
                  : "ROTTEN"}
              </p>
            </div>
          </motion.div>
        )}

        {/* Metacritic */}
        {ratings.metacritic && (
          <motion.div
            whileHover={{ scale: 1.02, borderColor: `${ratings.metacritic.color}66` }}
            className="group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all cursor-crosshair"
            style={{
              borderColor: `${ratings.metacritic.color}15`,
              backgroundColor: `#0c0c1080`,
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{ 
                backgroundColor: ratings.metacritic.color,
                boxShadow: `0 0 15px ${ratings.metacritic.color}33`
              }}
            >
              <span className="text-xs font-black text-white font-mono">
                MC
              </span>
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white font-mono">
                {ratings.metacritic.label}
                <span className="text-xs font-normal text-[#70707f]">/100</span>
              </div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#70707f] mt-0.5">
                METACRITIC
              </p>
            </div>
          </motion.div>
        )}

        {/* TMDB */}
        {ratings.tmdb && (
          <motion.div 
            whileHover={{ scale: 1.02, borderColor: "rgba(1, 210, 119, 0.4)" }}
            className="group flex items-center gap-3 rounded-2xl border border-[#01D277]/10 bg-[#0c0c10]/60 px-4 py-3 transition-all cursor-crosshair"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#01D277] shadow-[0_0_15px_rgba(1,210,119,0.2)]">
              <Star className="h-4.5 w-4.5 fill-white text-white" />
            </div>
            <div>
              <div className="text-lg font-black tracking-tight text-white font-mono">
                {ratings.tmdb.label}
                <span className="text-xs font-normal text-[#70707f]">/10</span>
              </div>
              <p className="text-[9px] font-mono uppercase tracking-wider text-[#70707f] mt-0.5">
                TMDB INDEX
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Composite NeuralFlix Score cockpit dashboard */}
      {data.composite_score > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0c0c10]/40 p-6 flex flex-col md:flex-row items-center gap-6"
        >
          {/* Holographic backdrop lines */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
          
          <div className="relative flex h-20 w-20 items-center justify-center z-10">
            {/* Concentric telemetry grid lines */}
            <svg className="absolute h-20 w-20 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="rgba(0,220,229,0.05)"
                strokeWidth="1"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgba(255,255,255,0.02)"
                strokeWidth="0.5"
              />
              {/* Outer gauge indicator path */}
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
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{
                  stroke:
                    data.composite_score >= 75
                      ? "#00dce5"
                      : data.composite_score >= 50
                      ? "#f59e0b"
                      : "#ef4444",
                  filter: `drop-shadow(0 0 4px ${
                    data.composite_score >= 75
                      ? "rgba(0,220,229,0.4)"
                      : data.composite_score >= 50
                      ? "rgba(245,158,11,0.4)"
                      : "rgba(239,68,68,0.4)"
                  })`
                }}
              />
            </svg>
            <span className="text-xl font-mono font-black text-white">
              {Math.round(data.composite_score)}
            </span>
          </div>

          <div className="z-10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#00dce5]" />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#00dce5]">
                NEURALFLIX WEIGHTED HARMONICS
              </span>
            </div>
            <p className="mt-1 text-sm text-[#b9caca] leading-relaxed">
              Consolidated neural index dynamically computed across {data.total_sources} platform datasets.
            </p>
          </div>

          {/* Awards & Box Office telemetry chips */}
          <div className="ml-auto flex flex-wrap items-center gap-2.5 z-10">
            {data.awards && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2 font-mono text-[9px] text-[#b9caca] hover:border-[#F5C518]/25 transition-all">
                <Award className="h-3.5 w-3.5 text-[#F5C518] animate-pulse" />
                <span className="max-w-[220px] truncate uppercase font-bold tracking-wider">
                  {data.awards}
                </span>
              </div>
            )}
            {data.box_office && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 py-2 font-mono text-[9px] text-[#b9caca] hover:border-[#00dce5]/25 transition-all">
                <ThumbsUp className="h-3.5 w-3.5 text-[#00dce5]" />
                <span className="uppercase font-bold tracking-wider">
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
