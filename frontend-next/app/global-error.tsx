"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global App Error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 font-playfair text-[var(--accent-rose)]">Something went wrong!</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            A critical error occurred in the NeuralFlix shell. Please try reloading the page.
          </p>
          <button
            className="px-6 py-3 bg-[var(--accent-warm)] text-black font-bold rounded-xl hover:brightness-110 transition-all shadow-glow"
            onClick={() => reset()}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
