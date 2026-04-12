'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import MovieRow from '../MovieRow';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MOODS = [
  // Universal Moods
  { id: 'feel_good',     emoji: '😄',  label: 'Feel Good',     color: '#FFD700', desc: 'Uplifting & heartwarming' },
  { id: 'mind_blown',    emoji: '🤯',  label: 'Mind Blown',    color: '#9B59B6', desc: 'Twists & revelations' },
  { id: 'adrenaline',    emoji: '🔥',  label: 'Adrenaline',    color: '#FF4500', desc: 'Epic action & thrills' },
  { id: 'want_to_cry',   emoji: '🌧️',  label: 'Cry It Out',    color: '#6B9AFF', desc: 'Emotional deep-dives' },
  { id: 'deep_thoughts',  emoji: '🧠',  label: 'Thoughtful',    color: '#00D4FF', desc: 'Philosophical & profound' },
  { id: 'family_time',   emoji: '👨‍👩‍👧', label: 'Family Time',   color: '#10B981', desc: 'All-ages entertainment' },
  { id: 'date_night',    emoji: '💕',  label: 'Date Night',    color: '#EC4899', desc: 'Romance & charm' },
  
  // Culture-Specific Moods
  { id: 'desi_vibes',    emoji: '🇮🇳',  label: 'Desi Vibes',    color: '#FF6B35', desc: 'Indian cinema magic' },
  { id: 'korean_wave',   emoji: '🇰🇷',  label: 'Korean Wave',   color: '#4A90D9', desc: 'K-drama & thrillers' },
  { id: 'anime_night',   emoji: '🇯🇵',  label: 'Anime Night',   color: '#C0392B', desc: 'Japanese animation' },
  { id: 'french_mood',   emoji: '🇫🇷',  label: 'French Mood',   color: '#6C5CE7', desc: 'Art-house & romance' },
  
  // Special Moods
  { id: 'award_winners', emoji: '🏆',  label: 'Award Winners', color: '#F5C518', desc: 'Critically acclaimed' },
  { id: 'hidden_gems',   emoji: '💎',  label: 'Hidden Gems',   color: '#00D4FF', desc: 'Undiscovered masterpieces' },
  { id: 'classic_cinema',emoji: '🕰️',  label: 'Classic Cinema', color: '#F97316', desc: 'Timeless masterpieces' },
  { id: 'new_releases',  emoji: '🌟',  label: 'New Releases',  color: '#10B981', desc: 'Fresh from theaters' },
  { id: '90s_bollywood', emoji: '🎵',  label: '90s Bollywood', color: '#F39C12', desc: 'Golden era nostalgia' },
];

export function MoodSelector() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
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
      } catch (e) {
        console.error("Failed to fetch mood movies:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodMovies();
  }, [selectedMood]);

  const handleSelection = (moodId: string) => {
    setSelectedMood(selectedMood === moodId ? null : moodId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-2">
          How do you want to <span className="text-accent">feel</span> today?
        </h2>
        <p className="text-sm text-text-muted">
          Pick a mood and discover films from around the world
        </p>
      </div>

      {/* Mood Grid */}
      <div className="flex flex-wrap justify-center gap-3 max-w-5xl mx-auto">
        {MOODS.map((mood) => (
          <motion.button
            key={mood.id}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelection(mood.id)}
            className={`cursor-pointer rounded-xl flex items-center gap-2.5 px-4 py-3 border-2 transition-all duration-200 ${
              selectedMood === mood.id
                ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                : 'border-transparent bg-surface hover:bg-bg-elevated hover:border-border'
            }`}
          >
            <span
              className="text-2xl drop-shadow-lg"
              style={{ filter: `drop-shadow(0 0 8px ${mood.color}40)` }}
            >
              {mood.emoji}
            </span>
            <div className="text-left">
              <p className={`font-bold text-sm tracking-tight ${
                selectedMood === mood.id ? 'text-accent' : 'text-text-primary'
              }`}>
                {mood.label}
              </p>
              <p className="text-[10px] text-text-muted hidden sm:block">
                {mood.desc}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Results Row */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {moodMovies.length > 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <MovieRow
            title={`${MOODS.find(m => m.id === selectedMood)?.emoji} ${MOODS.find(m => m.id === selectedMood)?.label} — Results`}
            movies={moodMovies}
          />
        </motion.div>
      )}
    </div>
  );
}