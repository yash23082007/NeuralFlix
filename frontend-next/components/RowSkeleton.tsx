export default function RowSkeleton({ label }: { label: string }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-5 w-[3px] rounded-full bg-[var(--surface-muted)]" />
        <div className="skeleton h-5 w-40 rounded-lg" />
      </div>
      <div className="flex gap-5 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-none w-[200px] space-y-2.5" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="skeleton aspect-[2/3] rounded-xl" />
            <div className="skeleton h-4 w-3/4 rounded-lg" />
            <div className="skeleton h-3 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    </section>
  );
}
