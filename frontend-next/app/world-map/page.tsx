import CinemaWorldMap from "../../components/CinemaWorldMap";

export const metadata = {
  title: "Cinema World Map — NeuralFlix",
  description: "Explore cinema from every corner of the globe. Click any country to discover its film tradition.",
};

export default function WorldMapPage() {
  return (
    <main className="min-h-screen bg-background pt-20 page-enter">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-text-primary mb-3">
            🌍 Cinema World Map
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Cinema knows no borders. Click on any highlighted country to explore its unique film tradition — from Bollywood to Nollywood, Tokyo to Tehran.
          </p>
        </div>

        <CinemaWorldMap />

        {/* Region Quick Links */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Indian Cinema", flag: "🇮🇳", href: "/cinema/indian", count: "12,000+", accent: "border-l-[#FF6B35]" },
            { name: "Korean Cinema", flag: "🇰🇷", href: "/cinema/korean", count: "2,800+", accent: "border-l-[#4A90D9]" },
            { name: "Japanese Cinema", flag: "🇯🇵", href: "/cinema/japanese", count: "4,200+", accent: "border-l-[#C0392B]" },
            { name: "French Cinema", flag: "🇫🇷", href: "/cinema/french", count: "3,100+", accent: "border-l-[#6C5CE7]" },
            { name: "Hollywood", flag: "🇺🇸", href: "/cinema/hollywood", count: "45,000+", accent: "border-l-[#F5A623]" },
            { name: "Spanish Cinema", flag: "🇪🇸", href: "/cinema/spanish", count: "1,800+", accent: "border-l-[#E67E22]" },
            { name: "Nollywood", flag: "🇳🇬", href: "/cinema/nollywood", count: "2,100+", accent: "border-l-[#F39C12]" },
            { name: "Iranian Cinema", flag: "🇮🇷", href: "/cinema/iranian", count: "450+", accent: "border-l-[#27AE60]" },
          ].map((region) => (
            <a
              key={region.name}
              href={region.href}
              className={`glass-card p-4 border-l-4 ${region.accent} hover:bg-bg-elevated transition-all group`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{region.flag}</span>
                <div>
                  <h3 className="font-heading font-bold text-text-primary group-hover:text-accent transition-colors text-sm">
                    {region.name}
                  </h3>
                  <p className="text-xs text-text-muted">{region.count} films</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
