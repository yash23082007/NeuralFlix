"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, Award, TrendingUp } from "lucide-react";
import { getAggregatedRatings, type AggregatedRatings } from "../../lib/api";

/**
 * Multi-Source Rating Panel — Inspired by Letterboxd + IMDb.
 * Displays IMDb, TMDB, Rotten Tomatoes, and Metacritic scores
 * alongside a weighted NeuralFlix composite score.
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
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20 w-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.total_sources === 0) return null;

  const ratings = data.ratings;

  return (
    <div className="space-y-4">
      {/* Rating Cards Grid */}
      <div className="flex flex-wrap gap-3">
        {/* IMDb */}
        {ratings.imdb && (
          <div className="group flex items-center gap-3 rounded-2xl border border-[#F5C518]/20 bg-gradient-to-br from-[#F5C518]/5 to-transparent px-4 py-3 transition-all hover:border-[#F5C518]/40 hover:shadow-lg hover:shadow-[#F5C518]/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5C518] shadow-md">
              <span className="text-xs font-black text-black">IMDb</span>
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-text-primary">
                {ratings.imdb.label}
                <span className="text-sm font-medium text-text-muted">/10</span>
              </div>
              {ratings.imdb.votes != null && ratings.imdb.votes > 0 && (
                <p className="text-[10px] font-semibold text-text-muted">
                  {(ratings.imdb.votes / 1000).toFixed(0)}K votes
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rotten Tomatoes */}
        {ratings.rotten_tomatoes && (
          <div className="group flex items-center gap-3 rounded-2xl border border-[#FA320A]/20 bg-gradient-to-br from-[#FA320A]/5 to-transparent px-4 py-3 transition-all hover:border-[#FA320A]/40 hover:shadow-lg hover:shadow-[#FA320A]/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FA320A] to-[#FF6347] shadow-md">
              <span className="text-lg">
                {ratings.rotten_tomatoes.sentiment === "fresh" ? "🍅" : "🤢"}
              </span>
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-text-primary">
                {ratings.rotten_tomatoes.label}
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                {ratings.rotten_tomatoes.sentiment === "fresh"
                  ? "Certified Fresh"
                  : "Rotten"}
              </p>
            </div>
          </div>
        )}

        {/* Metacritic */}
        {ratings.metacritic && (
          <div
            className="group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:shadow-lg"
            style={{
              borderColor: `${ratings.metacritic.color}33`,
              background: `linear-gradient(135deg, ${ratings.metacritic.color}08, transparent)`,
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{ backgroundColor: ratings.metacritic.color }}
            >
              <span className="text-sm font-black text-white">
                {ratings.metacritic.label}
              </span>
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-text-primary">
                {ratings.metacritic.label}
                <span className="text-sm font-medium text-text-muted">/100</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                Metacritic
              </p>
            </div>
          </div>
        )}

        {/* TMDB */}
        {ratings.tmdb && (
          <div className="group flex items-center gap-3 rounded-2xl border border-[#01D277]/20 bg-gradient-to-br from-[#01D277]/5 to-transparent px-4 py-3 transition-all hover:border-[#01D277]/40 hover:shadow-lg hover:shadow-[#01D277]/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#01D277] to-[#90CEA1] shadow-md">
              <Star className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-text-primary">
                {ratings.tmdb.label}
                <span className="text-sm font-medium text-text-muted">/10</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                TMDB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Composite NeuralFlix Score */}
      {data.composite_score > 0 && (
        <div className="premium-card flex items-center gap-5 rounded-2xl p-5">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-border"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="3"
                strokeDasharray={`${data.composite_score} ${100 - data.composite_score}`}
                strokeLinecap="round"
                className="text-accent transition-all duration-1000"
                style={{
                  stroke:
                    data.composite_score >= 75
                      ? "#10B981"
                      : data.composite_score >= 50
                      ? "#F59E0B"
                      : "#EF4444",
                }}
              />
            </svg>
            <span className="absolute text-lg font-black text-text-primary">
              {Math.round(data.composite_score)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-xs font-black uppercase tracking-widest text-accent">
                NeuralFlix Score
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Weighted aggregate of {data.total_sources} sources
            </p>
          </div>

          {/* Awards & Box Office Chips */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {data.awards && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#F5C518]/20 bg-[#F5C518]/5 px-3 py-1.5">
                <Award className="h-3.5 w-3.5 text-[#F5C518]" />
                <span className="max-w-[200px] truncate text-[11px] font-bold text-text-secondary">
                  {data.awards}
                </span>
              </div>
            )}
            {data.box_office && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5">
                <ThumbsUp className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-bold text-text-secondary">
                  {data.box_office}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
