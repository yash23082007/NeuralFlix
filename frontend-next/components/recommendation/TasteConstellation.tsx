"use client";

import { useState, useEffect, useRef } from "react";
import { Sliders, Sparkles, RefreshCw, Undo2, Map, Mountain, Zap, Shield, Compass } from "lucide-react";
import { authFetch } from "../../lib/auth";

export interface TasteControls {
  global: number;
  challenge: number;
  pace: number;
  hiddenGems: number;
  diversityBoost: boolean;
}

const DEFAULT_CONTROLS: TasteControls = {
  global: 50,
  challenge: 50,
  pace: 50,
  hiddenGems: 50,
  diversityBoost: true,
};

interface TasteConstellationProps {
  onControlsChange?: (controls: TasteControls) => void;
  compact?: boolean;
}

export default function TasteConstellation({ onControlsChange, compact = false }: TasteConstellationProps) {
  const [controls, setControls] = useState<TasteControls>(DEFAULT_CONTROLS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isInitialMount = useRef(true);

  useEffect(() => {
    fetchControls();
  }, []);

  const fetchControls = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${apiBase}/api/v1/users/me/taste-controls`);
      if (res.ok) {
        const data = await res.json();
        setControls(data);
        if (onControlsChange) {
          onControlsChange(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch taste controls", err);
    } finally {
      setLoading(false);
    }
  };

  const saveControls = async (newControls: TasteControls) => {
    setSaving(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${apiBase}/api/v1/users/me/taste-controls`, {
        method: "PUT",
        body: JSON.stringify(newControls),
      });
      if (!res.ok) {
        throw new Error("Failed to save preferences");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save when user moves sliders
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (loading) return;

    if (onControlsChange) {
      onControlsChange(controls);
    }

    const timer = setTimeout(() => {
      saveControls(controls);
    }, 600);
    return () => clearTimeout(timer);
  }, [controls]);

  const handleReset = async () => {
    setControls(DEFAULT_CONTROLS);
    if (onControlsChange) onControlsChange(DEFAULT_CONTROLS);
    await saveControls(DEFAULT_CONTROLS);
  };

  const sliders = [
    { key: "global", labelLeft: "Domestic", labelRight: "World Cinema", icon: Map },
    { key: "challenge", labelLeft: "Accessible", labelRight: "Challenging", icon: Mountain },
    { key: "pace", labelLeft: "Slow-Burn", labelRight: "High-Octane", icon: Zap },
    { key: "hiddenGems", labelLeft: "Blockbusters", labelRight: "Hidden Gems", icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)]">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-warm)]" />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xl relative overflow-hidden ${compact ? 'p-4 sm:p-5' : 'p-6 sm:p-7'}`}>
      {/* Background radial glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--accent-warm)]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-warm)]/15 text-[var(--accent-warm)]">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Taste Constellation</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Transparent, steerable recommendation weights.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {saving && <span className="text-[10px] font-bold text-[var(--accent-warm)] animate-pulse uppercase tracking-wider">Syncing...</span>}
            <button 
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
            >
              <Undo2 className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {sliders.map((s) => {
            const Icon = s.icon;
            const val = controls[s.key as keyof TasteControls] as number;
            return (
              <div key={s.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                  <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--accent-warm)]" />
                    {s.labelLeft}
                  </span>
                  <span className="font-mono text-xs text-[var(--accent-warm)] font-bold">{val}%</span>
                  <span className="text-[var(--text-tertiary)]">
                    {s.labelRight}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={val}
                  onChange={(e) => setControls({ ...controls, [s.key]: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent-warm)] h-1.5 bg-[var(--surface-muted)] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            );
          })}

          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                Diversity Boost
              </h4>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 max-w-[280px]">
                Injects high-rated world cinema to prevent echo chambers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={controls.diversityBoost}
                onChange={(e) => setControls({ ...controls, diversityBoost: e.target.checked })}
              />
              <div className="w-10 h-5 bg-[var(--surface-muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-warm)]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
