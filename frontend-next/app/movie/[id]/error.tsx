"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Movie detail route crash caught:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center px-6 pt-24">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/50 p-8 text-center backdrop-blur-md shadow-2xl">
        <AlertCircle className="mx-auto h-12 w-12 text-[var(--accent-rose)] animate-pulse" />
        
        <h2 className="mt-4 text-2xl font-bold text-white font-playfair">
          Something Went Wrong
        </h2>
        
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          An error occurred while loading this cinematic data. Let&apos;s try pulling it from our catalog indices again.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-warm)] px-5 py-3 text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
          >
            <Home className="h-4 w-4" /> Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
