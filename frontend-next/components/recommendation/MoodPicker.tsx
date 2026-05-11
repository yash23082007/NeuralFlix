"use client";

import { useRouter } from "next/navigation";
import { Activity, Brain, Clapperboard, Compass, Gem, Trophy } from "lucide-react";

const SIGNALS = [
  { id: "feel_good", label: "Feel-good", icon: Activity, tone: "text-cyan-400" },
  { id: "mind_blown", label: "High novelty", icon: Brain, tone: "text-purple-400" },
  { id: "adrenaline", label: "Action bias", icon: Clapperboard, tone: "text-red-400" },
  { id: "desi_vibes", label: "Indian signal", icon: Compass, tone: "text-orange-400" },
  { id: "award_winners", label: "Critical acclaim", icon: Trophy, tone: "text-yellow-400" },
  { id: "hidden_gems", label: "Long-tail gems", icon: Gem, tone: "text-emerald-400" },
];

export function MoodPicker() {
  const router = useRouter();

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-accent">Preference signals</p>
          <h2 className="text-2xl font-black text-text-primary md:text-3xl">
            Tune the recommender
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-text-muted">
          Select a signal to seed recall and reranking with a specific content pattern.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {SIGNALS.map((signal) => {
          const Icon = signal.icon;
          return (
            <button
              key={signal.id}
              onClick={() => router.push(`/search?mood=${signal.id}`)}
              className="premium-card group flex min-h-[112px] flex-col justify-between rounded-lg p-4 text-left transition-all hover:-translate-y-1 hover:border-accent/45"
            >
              <Icon className={`h-5 w-5 ${signal.tone}`} />
              <div>
                <span className="block text-sm font-black text-text-primary">{signal.label}</span>
                <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  {signal.id.replace(/_/g, " ")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
