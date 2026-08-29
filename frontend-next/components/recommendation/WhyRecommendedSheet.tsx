"use client";

import { X, Info, Sparkles, Map, Heart, Zap, Globe, Clock, ShieldCheck, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { authFetch } from "../../lib/auth";

interface Reason {
  type: string;
  label: string;
  evidence: string[];
}

interface ComponentAttr {
  feature: string;
  delta: number;
  because: string;
}

interface WhyData {
  movieId: number;
  explanation: string;
  factors: string[];
  reasons: Reason[];
  score?: number;
  rankingVersion?: string;
  components?: ComponentAttr[];
  catalogFreshness?: {
    updatedAt: string;
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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${apiBase}/api/v1/recommendations/${movieId}/why`);
      if (!res.ok) throw new Error("Failed to load explanation");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load explanation");
    } finally {
      setLoading(false);
    }
  };

  const getReasonIcon = (type: string) => {
    switch (type) {
      case "genre_overlap":
      case "pace_match":
        return <Clock className="h-4 w-4 text-amber-400" />;
      case "global_taste":
      case "country_discovery":
        return <Globe className="h-4 w-4 text-blue-400" />;
      case "hidden_gems":
      case "hidden_gem_preference":
        return <Sparkles className="h-4 w-4 text-amber-300" />;
      case "baseline_quality":
        return <Award className="h-4 w-4 text-yellow-400" />;
      case "challenge_match":
      case "adventurous_discovery":
        return <Zap className="h-4 w-4 text-emerald-400" />;
      default:
        return <Info className="h-4 w-4 text-[var(--accent-warm)]" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[var(--surface-elevated)] border-t border-[var(--border-default)] shadow-2xl transition-transform sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:rounded-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:border">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/90 p-4 backdrop-blur-md sm:p-5">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-warm)]" />
            Why We Recommended This
          </h2>
          <button 
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent-warm)] border-r-transparent" />
              <span className="text-xs text-[var(--text-tertiary)]">Computing Taste Profile attributions...</span>
            </div>
          )}
          
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-xs text-red-400">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Natural language summary */}
              <div className="rounded-xl bg-[var(--surface-muted)] p-3.5 border border-[var(--border-subtle)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed">
                  {data.explanation}
                </p>
              </div>

              {/* Attribution factors */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Score Components & Attributions
                </h3>
                
                {data.reasons && data.reasons.length > 0 ? (
                  <div className="grid gap-2">
                    {data.reasons.map((reason, i) => (
                      <div 
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3 transition-colors hover:border-[var(--border-default)]"
                      >
                        <div className="mt-0.5 rounded-lg bg-[var(--surface-muted)] p-1.5">
                          {getReasonIcon(reason.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {reason.label}
                          </p>
                          {reason.evidence && reason.evidence.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {reason.evidence.map((ev, idx) => (
                                <span 
                                  key={idx}
                                  className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] font-mono"
                                >
                                  {ev}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-tertiary)]">Calculated from your active taste parameters.</p>
                )}
              </div>

              {/* Engine version footer */}
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-[10px] text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Deterministic attribution (No black-box hallucination)
                </span>
                <span className="font-mono text-[var(--text-tertiary)]">v1.0</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
