"use client";

import { X, Check } from "lucide-react";
import { useState } from "react";
import { authFetch } from "../../lib/auth";

const REASONS = [
  { id: "already_watched", label: "Already watched this" },
  { id: "not_interested", label: "Just not interested" },
  { id: "too_slow", label: "I prefer faster-paced films" },
  { id: "too_dark", label: "Too dark or challenging" },
  { id: "not_my_genre", label: "Not my kind of genre" },
  { id: "wrong_language", label: "Not in my preferred language" },
  { id: "hide_similar", label: "Hide similar films" },
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
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/recommendations/feedback`, {
        method: "POST",
        body: JSON.stringify({
          movieId,
          action: "not_interested",
          reason: reasonId,
        }),
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onDismiss(movieId);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to submit feedback", err);
      // Even if backend fails, dismiss it locally for good UX
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
        className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed left-1/2 top-1/2 z-[120] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface border border-border p-6 shadow-2xl">
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-500">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">Got it.</h3>
            <p className="mt-2 text-sm text-text-muted">We've tuned your recommendations.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-text-primary">Not a match?</h3>
                <p className="text-xs text-text-muted mt-1">Tell us why so we can adjust your taste profile.</p>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 text-text-muted hover:bg-background hover:text-text-primary transition-colors"
                disabled={submitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSubmit(r.id)}
                  disabled={submitting}
                  className="rounded-xl border border-border bg-background p-3 text-left text-sm font-medium text-text-primary transition-all hover:border-accent hover:bg-accent/5 disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background"
                >
                  {r.label}
                </button>
              ))}
            </div>
            
            <p className="mt-4 text-center text-[10px] text-text-muted">
              Your feedback directly updates your Taste Constellation sliders.
            </p>
          </>
        )}
      </div>
    </>
  );
}
