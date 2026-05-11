"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="relative flex flex-col items-center gap-8 text-center max-w-md">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-accent" />
          </div>
          <div className="absolute -inset-3 rounded-2xl bg-accent/5 blur-2xl" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">System Malfunction</h1>
          <p className="text-sm text-text-muted leading-relaxed max-w-sm">
            The recommendation engine encountered an unexpected error. Our team has been notified.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neural-crimson-dim"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-bg-elevated hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
