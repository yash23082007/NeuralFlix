import Link from "next/link";
import CinemaWorldMap from "../../components/CinemaWorldMap";

export const metadata = {
  title: "Regional Signal Map | NeuralFlix ML",
  description: "Explore regional cinema clusters used by the recommendation system.",
};

const QUICK_LINKS = [
  { name: "Indian Cinema", href: "/cinema/indian", count: "12,000+", accent: "border-l-[#FF6B35]" },
  { name: "Korean Cinema", href: "/cinema/korean", count: "2,800+", accent: "border-l-[#4A90D9]" },
  { name: "Japanese Cinema", href: "/cinema/japanese", count: "4,200+", accent: "border-l-[#C0392B]" },
  { name: "French Cinema", href: "/cinema/french", count: "3,100+", accent: "border-l-[#6C5CE7]" },
  { name: "Hollywood", href: "/cinema/hollywood", count: "45,000+", accent: "border-l-[#F5A623]" },
  { name: "Spanish Cinema", href: "/cinema/spanish", count: "1,800+", accent: "border-l-[#E67E22]" },
  { name: "Nollywood", href: "/cinema/nollywood", count: "2,100+", accent: "border-l-[#F39C12]" },
  { name: "Iranian Cinema", href: "/cinema/iranian", count: "450+", accent: "border-l-[#27AE60]" },
];

export default function WorldMapPage() {
  return (
    <main className="min-h-screen bg-background pt-24 page-enter">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-wide text-accent">Regional embeddings</p>
          <h1 className="mt-2 text-4xl font-black text-text-primary md:text-5xl">
            Global cinema map
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
            Language, origin market, and cultural cluster signals for world cinema discovery.
          </p>
        </div>

        <CinemaWorldMap />

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {QUICK_LINKS.map((region) => (
            <Link
              key={region.name}
              href={region.href}
              className={`rounded-lg border border-border border-l-4 bg-surface p-4 shadow-card transition-colors hover:bg-bg-elevated ${region.accent}`}
            >
              <h3 className="text-sm font-black text-text-primary">{region.name}</h3>
              <p className="mt-1 text-xs font-semibold text-text-muted">{region.count} titles</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
