"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const MOODS = [
  { id: "feel_good", label: "Feel Good", emoji: "😄", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "want_to_cry", label: "Cry It Out", emoji: "😭", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  { id: "mind_blown", label: "Mind Blown", emoji: "🤯", color: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20" },
  { id: "adrenaline", label: "Epic Action", emoji: "⚔️", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  { id: "desi_vibes", label: "Desi Vibes", emoji: "🇮🇳", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { id: "korean_wave", label: "Korean Wave", emoji: "🇰🇷", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
];

export function MoodPicker() {
  const router = useRouter();

  const handleSelect = (moodId: string) => {
    router.push(`/search?mood=${moodId}`);
  };

  return (
    <section className="py-12">
      <h3 className="text-2xl font-display font-medium mb-6 text-zinc-100">
        What do you feel like watching?
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            onClick={() => handleSelect(mood.id)}
            className={`
              flex flex-col items-center justify-center p-6 rounded-2xl border
              transition-all duration-300 hover:scale-105 hover:shadow-lg
              ${mood.color}
            `}
          >
            <span className="text-4xl mb-3 drop-shadow-md">{mood.emoji}</span>
            <span className="font-semibold tracking-wide">{mood.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
