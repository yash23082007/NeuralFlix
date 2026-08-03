"use client";

import { X, Info, Sparkles, Map, Heart, Zap, Globe, Clock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { authFetch } from "../../lib/auth";
import FreshnessBadge, { FreshnessStatus } from "./FreshnessBadge";

interface Reason {
  type: string;
  label: string;
  evidence: string[];
}

interface WhyData {
  movieId: number;
  reasons: Reason[];
  rankingVersion: string;
  catalogFreshness: {
    updatedAt: string;
    ageHours: number;
  };
}

interface WhyRecommendedSheetProps {
  movieId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function WhyRecommendedSheet({ movieId, isOpen, onClose }: WhyRecommendedSheetProps) {
  const [data, setData] = useState<WhyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && movieId) {
      fetchWhy();
    } else {
      setData(null);
    }
  }, [isOpen, movieId]);

  const fetchWhy = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/recommendations/${movieId}/why`);
      if (!res.ok) throw new Error("Failed to load explanation");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case "genre_overlap": return <Heart className="h-4 w-4 text-pink-500" />;
      case "language_match": return <Globe className="h-4 w-4 text-blue-500" />;
      case "country_discovery": return <Map className="h-4 w-4 text-purple-500" />;
      case "pace_match": return <Clock className="h-4 w-4 text-orange-500" />;
      case "hidden_gem_preference": return <Sparkles className="h-4 w-4 text-yellow-500" />;
      case "diversity_boost": return <Zap className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-accent" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] transition-transform sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-b-3xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/80 p-4 backdrop-blur-md sm:p-6">
          <h2 className="text-lg font-black text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Why We Recommended This
          </h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-background hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {loading && (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-r-transparent" />
            </div>
          )}
          
          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500">
              {error}
            </div>
          )}
          
          {data && (
            <div className="space-y-6">
              <div className="space-y-4">
                {data.reasons.map((r, i) => (
                  <div key={i} className="flex gap-4 rounded-xl border border-border bg-background p-4">
                    <div className="mt-1 shrink-0">
                      {getReasonIcon(r.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{r.label}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.evidence.map((ev, j) => (
                          <span key={j} className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-muted">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 rounded-xl bg-accent/5 p-4 border border-accent/10">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Transparency Metadata
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-text-muted">Ranking Engine</span>
                    <span className="font-medium text-text-primary mt-1 block font-mono bg-background px-2 py-1 rounded inline-block">
                      {data.rankingVersion}
                    </span>
                  </div>
                  <div>
                    <span className="block text-text-muted mb-1">Catalog Freshness</span>
                    <FreshnessBadge 
                      status={data.catalogFreshness.ageHours < 24 ? "fresh" : data.catalogFreshness.ageHours < 72 ? "aging" : "stale"} 
                      checkedAt={data.catalogFreshness.updatedAt}
                      source="DB"
                    />
                  </div>
                </div>
              </div>
              
              <p className="text-center text-[10px] text-text-muted mt-4">
                NeuralFlix never infers mood from private data or tracking. All recommendations are based on your explicit preferences and watch history.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
