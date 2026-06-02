import React from "react";

export function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border-subtle)] w-[200px]">
      {/* Poster */}
      <div className="w-full aspect-[2/3] animate-pulse bg-zinc-800/40" />
      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="h-3 bg-zinc-800/40 rounded-full w-4/5 animate-pulse" />
        <div className="h-2 bg-zinc-800/40 rounded-full w-2/5 animate-pulse" />
        <div className="h-1.5 bg-zinc-800/40 rounded-full w-full mt-3 animate-pulse" />
      </div>
    </div>
  );
}

export function RowSkeleton({ label }: { label: string }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-[3px] rounded-full bg-[var(--accent-warm)]" />
          <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {label}
          </h2>
        </div>
      </div>
      <div className="flex gap-5 overflow-hidden pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[200px]">
            <CardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export default RowSkeleton;
