"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--surface-primary)] px-6">
      <AlertTriangle className="h-12 w-12 text-[var(--accent-rose)]" />
      <h2 className="text-2xl font-bold text-[var(--text-primary)]">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-[var(--accent-warm)] px-6 py-3 text-sm font-semibold text-black transition-all hover:brightness-110"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-6 py-3 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </div>
    </div>
  );
}
