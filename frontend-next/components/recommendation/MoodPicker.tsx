"use client";

import { useRouter } from "next/navigation";
import { Activity, Brain, Clapperboard, Compass, Gem, Trophy, Cpu } from "lucide-react";
import { motion } from "framer-motion";

const SIGNALS = [
  { 
    id: "feel_good", 
    label: "Feel-Good Vibe", 
    icon: Activity, 
    tone: "text-cyan-400 border-cyan-400/20 hover:border-cyan-400/50 hover:bg-cyan-950/10",
    glowColor: "rgba(34, 211, 238, 0.15)"
  },
  { 
    id: "mind_blown", 
    label: "Mind-Bending", 
    icon: Brain, 
    tone: "text-purple-400 border-purple-400/20 hover:border-purple-400/50 hover:bg-purple-950/10",
    glowColor: "rgba(192, 132, 252, 0.15)"
  },
  { 
    id: "adrenaline", 
    label: "Adrenaline Burst", 
    icon: Clapperboard, 
    tone: "text-red-400 border-red-400/20 hover:border-red-400/50 hover:bg-red-950/10",
    glowColor: "rgba(248, 113, 113, 0.15)"
  },
  { 
    id: "desi_vibes", 
    label: "Desi Cinema Vibe", 
    icon: Compass, 
    tone: "text-orange-400 border-orange-400/20 hover:border-orange-400/50 hover:bg-orange-950/10",
    glowColor: "rgba(251, 146, 60, 0.15)"
  },
  { 
    id: "award_winners", 
    label: "Critical Acclaim", 
    icon: Trophy, 
    tone: "text-yellow-400 border-yellow-400/20 hover:border-yellow-400/50 hover:bg-yellow-950/10",
    glowColor: "rgba(250, 204, 21, 0.15)"
  },
  { 
    id: "hidden_gems", 
    label: "Long-Tail Gems", 
    icon: Gem, 
    tone: "text-emerald-400 border-emerald-400/20 hover:border-emerald-400/50 hover:bg-emerald-950/10",
    glowColor: "rgba(52, 211, 153, 0.15)"
  },
];

export function MoodPicker() {
  const router = useRouter();

  return (
    <section className="space-y-6">
      {/* HUD Signal Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#00dce5] font-black uppercase">
            <Cpu className="h-3.5 w-3.5 animate-pulse" />
            Tuning recommendation signals
          </div>
          <h2 className="text-2xl font-black text-white md:text-3xl mt-1">
            Seed Recommender Matrix
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-[#b9caca] font-sans">
          Select a semantic signal below to inject bias into catalog recall algorithms and rerank outcomes with custom emotional properties.
        </p>
      </div>

      {/* Grid of tuning devices */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {SIGNALS.map((signal, idx) => {
          const Icon = signal.icon;
          return (
            <motion.button
              key={signal.id}
              onClick={() => router.push(`/search?mood=${signal.id}`)}
              whileHover={{ 
                scale: 1.03, 
                y: -4,
                boxShadow: `0 15px 30px ${signal.glowColor}`
              }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: "spring", stiffness: 120 }}
              className={`relative overflow-hidden rounded-2xl border bg-[#0c0c10]/60 p-5 text-left transition-colors cursor-pointer flex flex-col justify-between min-h-[130px] ${signal.tone}`}
            >
              {/* Graphic scanlines inside cards */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.01] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
              
              <div className="flex items-center justify-between w-full">
                <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-[7px] font-mono text-[#70707f]">[ONLINE]</span>
              </div>
              
              <div className="mt-4">
                <span className="block text-sm font-bold text-white tracking-tight leading-tight">
                  {signal.label}
                </span>
                <span className="mt-1.5 block text-[8px] font-mono uppercase tracking-wider text-[#70707f]">
                  [{signal.id.replace(/_/g, " ")}]
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
export default MoodPicker;
