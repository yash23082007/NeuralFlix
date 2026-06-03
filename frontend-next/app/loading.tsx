import { Film } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)] relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[var(--accent-warm)]/5 blur-3xl pointer-events-none" />

      <div className="flex flex-col items-center gap-5 relative z-10">
        <div className="relative flex items-center justify-center">
          {/* Animated Spinner Ring */}
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--accent-warm)]" />
          {/* Central Pulsing Icon */}
          <Film className="absolute h-5 w-5 text-[var(--accent-warm)] animate-pulse" />
        </div>

        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase font-sans">
            Loading Cinema
          </p>
          <p className="text-xs text-[var(--text-tertiary)] font-sans">
            Configuring visual stream...
          </p>
        </div>
      </div>
    </div>
  );
}
