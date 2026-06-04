"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Brain, Flame, Smile, ShieldAlert, Heart, Activity } from "lucide-react";
import { motion } from "framer-motion";

const MOODS = [
  { id: "intense", label: "Intense", icon: Flame, gradient: "from-red-600/30 to-orange-600/20", border: "border-red-500/20", text: "text-red-400" },
  { id: "chill", label: "Chill", icon: Smile, gradient: "from-blue-600/30 to-teal-600/20", border: "border-blue-500/20", text: "text-blue-400" },
  { id: "funny", label: "Funny", icon: Smile, gradient: "from-yellow-600/30 to-amber-600/20", border: "border-yellow-500/20", text: "text-yellow-400" },
  { id: "scary", label: "Scary", icon: ShieldAlert, gradient: "from-purple-600/30 to-fuchsia-600/20", border: "border-purple-500/20", text: "text-purple-400" },
  { id: "romantic", label: "Romantic", icon: Heart, gradient: "from-pink-600/30 to-rose-600/20", border: "border-pink-500/20", text: "text-pink-400" },
  { id: "thoughtful", label: "Thoughtful", icon: Brain, gradient: "from-emerald-600/30 to-green-600/20", border: "border-emerald-500/20", text: "text-emerald-400" },
];

export default function MoodPickerStrip() {
  const router = useRouter();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-[var(--accent-warm)]">
        <Activity className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">How are you feeling?</span>
      </div>
      <h2 className="text-3xl font-bold text-white">Mood Picker</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          return (
            <motion.button
              key={mood.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/mood?select=${mood.id}`)}
              className={`rounded-2xl border ${mood.border} bg-gradient-to-br ${mood.gradient} p-5 text-left transition-all backdrop-blur-md cursor-pointer group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col justify-between h-20 relative z-10">
                <Icon className={`h-6 w-6 ${mood.text} group-hover:scale-110 transition-transform`} />
                <div>
                  <p className="font-bold text-white text-base">{mood.label}</p>
                  <p className="text-[10px] text-white/50 font-medium uppercase mt-0.5 tracking-wider">Discover →</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
