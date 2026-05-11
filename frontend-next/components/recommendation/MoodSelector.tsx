"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Activity, Brain, Clapperboard, Compass, Gem, Heart, Landmark, Sparkles, Trophy } from "lucide-react";
import MovieRow from "../MovieRow";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SIGNALS = [
  { id: "feel_good", label: "Feel-good", icon: Heart, color: "#00A6C7", desc: "Comedy, romance, family" },
  { id: "mind_blown", label: "High novelty", icon: Brain, color: "#7057FF", desc: "Thriller, mystery, sci-fi" },
  { id: "adrenaline", label: "Action bias", icon: Clapperboard, color: "#E50914", desc: "Action and adventure" },
  { id: "deep_thoughts", label: "Reflective", icon: Activity, color: "#27AE60", desc: "Drama and documentary" },
  { id: "desi_vibes", label: "Indian cluster", icon: Compass, color: "#FF6B35", desc: "Indian language cinema" },
  { id: "korean_wave", label: "Korean cluster", icon: Landmark, color: "#4A90D9", desc: "Korean thrillers and drama" },
  { id: "award_winners", label: "Critical acclaim", icon: Trophy, color: "#F5C518", desc: "High-rated broad consensus" },
  { id: "hidden_gems", label: "Long-tail gems", icon: Gem, color: "#00D4FF", desc: "High rating, lower vote count" },
  { id: "new_releases", label: "Freshness", icon: Sparkles, color: "#10B981", desc: "Recent release recency boost" },
];

export function MoodSelector() {
  const [selectedMood, setSelectedMood] = useState<string | null>("hidden_gems");
  const [moodMovies, setMoodMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedMood) {
      setMoodMovies([]);
      return;
    }

    const fetchMoodMovies = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/movies/mood/${selectedMood}`);
        if (res.ok) {
          const data = await res.json();
          setMoodMovies(data.results || []);
        }
      } catch (error) {
        console.error("Failed to fetch signal movies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodMovies();
  }, [selectedMood]);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-accent">Signal workbench</p>
        <h1 className="mt-2 text-4xl font-black text-text-primary">Preference signal testing</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
          Inspect how different intent proxies alter recall and ranking behavior.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SIGNALS.map((signal) => {
          const Icon = signal.icon;
          return (
            <motion.button
              key={signal.id}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMood(selectedMood === signal.id ? null : signal.id)}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedMood === signal.id
                  ? "border-accent bg-accent/10 shadow-gold"
                  : "border-border bg-surface shadow-card hover:border-accent/40"
              }`}
            >
              <Icon className="mb-5 h-5 w-5" style={{ color: signal.color }} />
              <p className="font-black text-text-primary">{signal.label}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{signal.id.replace(/_/g, " ")}</p>
              <p className="mt-3 text-sm leading-5 text-text-muted">{signal.desc}</p>
            </motion.button>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {moodMovies.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <MovieRow
            title={`${SIGNALS.find((signal) => signal.id === selectedMood)?.label || "Signal"} results`}
            movies={moodMovies}
          />
        </motion.div>
      )}
    </div>
  );
}
