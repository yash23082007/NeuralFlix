"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service like Sentry
    console.error("NeuralFlix App Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-6 text-center">
      <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-white tracking-wide font-bebas">System Malfunction</h2>
      <p className="text-text-muted max-w-md text-sm leading-relaxed">
        We encountered an error loading this section. Please try again or return to the main hub.
      </p>
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Retry Connection
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2.5 bg-surface border border-border hover:border-border-bright text-white font-medium rounded-lg transition-colors"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
