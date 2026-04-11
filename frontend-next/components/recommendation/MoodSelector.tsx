'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const MOODS = [
  { id: 'happy',       emoji: '😄', label: 'Happy',        color: '#FFD700' },
  { id: 'excited',     emoji: '🔥', label: 'Pumped Up',    color: '#FF4500' },
  { id: 'sad',         emoji: '🌧️', label: 'Melancholic',  color: '#6B9AFF' },
  { id: 'scared',      emoji: '👻', label: 'Thrill Me',    color: '#9B59B6' },
  { id: 'intellectual',emoji: '🧠', label: 'Thoughtful',   color: '#00D4FF' },
  { id: 'nostalgic',   emoji: '🌅', label: 'Nostalgic',    color: '#F97316' },
  { id: 'date_night',  emoji: '💕', label: 'Date Night',   color: '#EC4899' },
  { id: 'party',       emoji: '🎉', label: 'Party Mode',   color: '#10B981' },
];

export function MoodSelector() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleSelection = (moodId: string) => {
    setSelectedMood(moodId);
    // API Call goes here to hit `/v1/recommend/by-mood`
  };

  return (
    <div className="my-8">
      <h2 className="heading-section text-white mb-6 text-center">
        How do you want to <span className="text-neural-electric/90">feel</span> today?
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {MOODS.map(mood => (
          <motion.div
            key={mood.id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelection(mood.id)}
            className={`cursor-pointer rounded-2xl flex flex-col items-center justify-center p-6 border-2 transition-colors ${
              selectedMood === mood.id 
                ? 'border-neural-crimson bg-neural-crimson/10 shadow-glow' 
                : 'border-transparent bg-bg-surface hover:bg-bg-elevated'
            }`}
          >
            <span className="text-5xl mb-3 drop-shadow-xl" style={{ filter: `drop-shadow(0 0 10px ${mood.color}40)` }}>
              {mood.emoji}
            </span>
            <p className="text-gray-300 font-bold tracking-tight text-sm uppercase">
              {mood.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}