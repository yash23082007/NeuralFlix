"use client";

import { useState, useEffect } from "react";
import { Sliders, Sparkles, RefreshCw, Undo2, Map, Mountain, Zap, Shield, HelpCircle } from "lucide-react";
import { authFetch } from "../../lib/auth";

export interface TasteControls {
  discovery: number;
  global: number;
  challenge: number;
  pace: number;
  hiddenGems: number;
  diversityBoost: boolean;
}

const DEFAULT_CONTROLS: TasteControls = {
  discovery: 50,
  global: 50,
  challenge: 50,
  pace: 50,
  hiddenGems: 50,
  diversityBoost: true,
};

export default function TasteConstellation() {
  const [controls, setControls] = useState<TasteControls>(DEFAULT_CONTROLS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchControls();
  }, []);

  const fetchControls = async () => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/taste-controls`);
      if (res.ok) {
        const data = await res.json();
        setControls(data);
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
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/taste-controls`, {
        method: "PUT",
        body: JSON.stringify(newControls),
      });
      if (!res.ok) {
        throw new Error("Failed to save preferences");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Debounced save for sliders
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      saveControls(controls);
    }, 1000);
    return () => clearTimeout(timer);
  }, [controls]);

  const handleReset = async () => {
    setControls(DEFAULT_CONTROLS);
    await saveControls(DEFAULT_CONTROLS);
  };

  const sliders = [
    { key: "discovery", labelLeft: "Familiar", labelRight: "Adventurous", icon: CompassIcon },
    { key: "global", labelLeft: "Local", labelRight: "Global", icon: Map },
    { key: "challenge", labelLeft: "Light", labelRight: "Challenging", icon: Mountain },
    { key: "pace", labelLeft: "Fast-Paced", labelRight: "Slow-Burn", icon: Zap },
    { key: "hiddenGems", labelLeft: "Popular", labelRight: "Hidden Gems", icon: Sparkles },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-surface/50 border border-border">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      
      <div className="relative z-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary">Taste Constellation</h2>
              <p className="text-xs text-text-muted">Explicitly tune your recommendation engine.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {saving && <span className="text-[10px] font-bold text-accent animate-pulse uppercase tracking-wider">Syncing...</span>}
            <button 
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-3 text-xs text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {sliders.map((s) => (
            <div key={s.key} className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary uppercase tracking-wide">
                <span className="flex items-center gap-1.5 opacity-60">
                  <s.icon className="h-3.5 w-3.5" /> {s.labelLeft}
                </span>
                <span className="opacity-100 text-accent">{controls[s.key as keyof TasteControls] as number}%</span>
                <span className="flex items-center gap-1.5 opacity-60">
                  {s.labelRight}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={controls[s.key as keyof TasteControls] as number}
                onChange={(e) => setControls({ ...controls, [s.key]: parseInt(e.target.value) })}
                className="w-full accent-accent h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
          ))}

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                Diversity Boost
              </h4>
              <p className="text-xs text-text-muted mt-1 max-w-[250px]">
                Actively inject highly-rated global films outside your usual patterns to prevent filter bubbles.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={controls.diversityBoost}
                onChange={(e) => setControls({ ...controls, diversityBoost: e.target.checked })}
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompassIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
