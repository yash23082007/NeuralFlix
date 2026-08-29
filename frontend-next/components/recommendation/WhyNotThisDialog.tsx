"use client";

import { X, Check, ThumbsDown, EyeOff, FastForward, Moon, Globe, ShieldOff } from "lucide-react";
import { useState } from "react";
import { authFetch } from "../../lib/auth";

const REASONS = [
  { id: "already_watched", label: "Already watched this", icon: EyeOff },
  { id: "not_interested", label: "Just not interested", icon: ThumbsDown },
  { id: "too_slow", label: "I prefer faster-paced movies", icon: FastForward },
  { id: "too_dark", label: "Too dark or challenging", icon: Moon },
  { id: "not_my_genre", label: "Not my kind of genre", icon: ShieldOff },
  { id: "wrong_language", label: "Not in my preferred language", icon: Globe },
  { id: "hide_similar", label: "Hide similar movies", icon: EyeOff },
];

interface WhyNotThisDialogProps {
  movieId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onDismiss: (movieId: number) => void;
}

export default function WhyNotThisDialog({ movieId, isOpen, onClose, onDismiss }: WhyNotThisDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (reasonId: string) => {
    if (!movieId) return;

    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await authFetch(`${apiBase}/api/v1/recommendations/feedback?movie_id=${movieId}&action=${encodeURIComponent(reasonId)}`, {
        method: "POST",
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onDismiss(movieId);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to submit feedback", err);
      // Dismiss locally for responsive UX even on connection issue
      onDismiss(movieId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[var(--surface-elevated)] border-t border-[var(--border-default)] shadow-2xl transition-transform sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:rounded-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:border p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Why not this title?</h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Your input tunes your Taste Profile recommendations.</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {success ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-emerald-400">
              <Check className="h-8 w-8" />
              <p className="text-xs font-semibold">Preferences updated — title removed from future feeds.</p>
            </div>
          ) : (
            REASONS.map((reason) => {
              const Icon = reason.icon;
              return (
                <button
                  key={reason.id}
                  disabled={submitting}
                  onClick={() => handleSubmit(reason.id)}
                  className="w-full flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3.5 py-3 text-left text-xs font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] hover:text-[var(--accent-warm)] active:scale-[0.99] disabled:opacity-50"
                >
                  <Icon className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
                  <span>{reason.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
