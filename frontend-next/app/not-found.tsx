import { Film, Search, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="relative flex flex-col items-center gap-8 text-center max-w-md">
        <div className="relative">
          <div className="text-[140px] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-accent/20 to-transparent select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-12 w-12 text-accent/30" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Scene Not Found</h1>
          <p className="text-sm text-text-muted leading-relaxed">
            This frame doesn&apos;t exist in our catalog. It may have been removed or the link is incorrect.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neural-crimson-dim"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-bg-elevated hover:text-text-primary"
          >
            <Film className="h-4 w-4" />
            Discover Films
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-bg-elevated hover:text-text-primary"
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
