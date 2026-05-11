"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const CINEMA_DATA: Record<string, { region: string; count: number; topMovie: string; color: string; hover: string }> = {
  IND: { region: "indian", count: 12450, topMovie: "RRR", color: "var(--accent-india)", hover: "#ff8c61" },
  KOR: { region: "korean", count: 2840, topMovie: "Parasite", color: "var(--accent-korea)", hover: "#74a8e6" },
  JPN: { region: "japanese", count: 4200, topMovie: "Spirited Away", color: "var(--accent-japan)", hover: "#d65345" },
  FRA: { region: "french", count: 3100, topMovie: "Amelie", color: "var(--accent-france)", hover: "#8a7ceb" },
  USA: { region: "hollywood", count: 45000, topMovie: "The Godfather", color: "var(--accent-hollywood)", hover: "#ecc26c" },
  ESP: { region: "spanish", count: 1800, topMovie: "Pan's Labyrinth", color: "#e67e22", hover: "#f39c12" },
  IRN: { region: "iranian", count: 450, topMovie: "A Separation", color: "#27ae60", hover: "#2ecc71" },
  NGA: { region: "nollywood", count: 2100, topMovie: "The Black Book", color: "#f1c40f", hover: "#f39c12" },
};

export default function CinemaWorldMap() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; content: any } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[560px] w-full rounded-lg border border-border bg-bg-elevated" />;

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-lg border border-border bg-surface/80 p-4 backdrop-blur">
        <h2 className="flex items-center gap-2 text-xl font-black text-text-primary">
          <Globe2 className="h-5 w-5 text-accent" />
          Regional signal map
        </h2>
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          Cinema clusters by origin market and language family.
        </p>
      </div>

      <ComposableMap
        projection="geoMercator"
        height={560}
        projectionConfig={{ scale: 120, center: [0, 30] }}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = geo.id;
                const cinemaInfo = CINEMA_DATA[countryId];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    fill={cinemaInfo ? cinemaInfo.color : "var(--bg-elevated)"}
                    style={{
                      default: { outline: "none", transition: "all 220ms ease" },
                      hover: {
                        fill: cinemaInfo ? cinemaInfo.hover : "var(--bg-surface)",
                        outline: "none",
                        cursor: cinemaInfo ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(event) => {
                      if (cinemaInfo) {
                        setTooltipData({
                          x: event.clientX,
                          y: event.clientY,
                          content: { name: geo.properties.name, ...cinemaInfo },
                        });
                      }
                    }}
                    onMouseMove={(event) => {
                      if (cinemaInfo && tooltipData) {
                        setTooltipData({ ...tooltipData, x: event.clientX, y: event.clientY });
                      }
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                    onClick={() => {
                      if (cinemaInfo) router.push(`/cinema/${cinemaInfo.region}`);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltipData && (
        <div
          className="pointer-events-none fixed z-[90] rounded-lg border border-white/10 bg-black/85 px-4 py-3 text-white shadow-card backdrop-blur"
          style={{ top: tooltipData.y + 15, left: tooltipData.x + 15 }}
        >
          <div className="mb-1 flex items-center justify-between gap-3 text-base font-black">
            {tooltipData.content.name}
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white/70">
              {tooltipData.content.region}
            </span>
          </div>
          <div className="text-sm text-white/70">
            <span className="font-black text-accent">{tooltipData.content.count.toLocaleString()}</span> titles indexed
          </div>
          <div className="mt-1 border-t border-white/10 pt-1 text-sm text-white/70">
            Anchor: <span className="text-white">{tooltipData.content.topMovie}</span>
          </div>
        </div>
      )}
    </div>
  );
}
