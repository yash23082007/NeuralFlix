import Link from "next/link";
import { Home, Search, Film } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center page-enter">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[40vw] h-[40vw] bg-neural-crimson/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* 404 Number */}
        <div className="text-[120px] md:text-[180px] font-black text-text-primary/5 leading-none select-none">
          404
        </div>

        <div className="-mt-20 md:-mt-28 relative">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary">
            Scene Not Found
          </h1>
          <p className="text-text-secondary mt-3 max-w-md mx-auto">
            This page seems to have gone off-script. Let&apos;s get you back to
            the main feature.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold text-sm rounded-xl hover:bg-accent/90 transition-all shadow-gold"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border text-text-primary font-medium text-sm rounded-xl hover:border-accent/40 transition-all"
          >
            <Film className="w-4 h-4" />
            Discover Films
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border text-text-primary font-medium text-sm rounded-xl hover:border-accent/40 transition-all"
          >
            <Search className="w-4 h-4" />
            Search
          </Link>
        </div>
      </div>
    </main>
  );
}
