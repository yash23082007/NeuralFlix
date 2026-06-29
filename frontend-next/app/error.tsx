'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-transparent text-[var(--text-primary)] px-4 text-center">
      <h2 className="text-3xl font-bold mb-4 font-playfair text-[var(--accent-rose)]">Connection Lost</h2>
      <p className="text-[var(--text-secondary)] mb-8 max-w-md">
        The ML engine might be temporarily restarting or experiencing high load. Please try again.
      </p>
      <button
        className="px-6 py-3 bg-[var(--accent-warm)] text-black font-bold rounded-xl hover:brightness-110 transition-all shadow-glow"
        onClick={() => reset()}
      >
        Reload Page
      </button>
    </div>
  );
}
