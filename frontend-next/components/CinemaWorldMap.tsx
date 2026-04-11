"use client";

import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useRouter } from "next/navigation";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Cinema Data Simulation for Map
const CINEMA_DATA: Record<string, { region: string; count: number; topMovie: string; color: string; hover: string }> = {
  IND: { region: "indian", count: 12450, topMovie: "Pathaan", color: "var(--accent-india)", hover: "#ff8c61" },
  KOR: { region: "korean", count: 2840, topMovie: "Parasite", color: "var(--accent-korea)", hover: "#74a8e6" },
  JPN: { region: "japanese", count: 4200, topMovie: "Spirited Away", color: "var(--accent-japan)", hover: "#d65345" },
  FRA: { region: "french", count: 3100, topMovie: "Amélie", color: "var(--accent-france)", hover: "#8a7ceb" },
  USA: { region: "hollywood", count: 45000, topMovie: "The Godfather", color: "var(--accent)", hover: "#ecc26c" },
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

  if (!mounted) return <div className="w-full h-[600px] bg-bg-elevated animate-pulse rounded-xl" />;

  return (
    <div className="relative w-full h-[600px] bg-bg-elevated rounded-xl overflow-hidden border border-border shadow-2xl group">
      {/* Map Overlay Text */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h2 className="text-3xl font-display font-bold text-text-primary capitalize mb-2 gap-2 flex items-center">
          <span className="text-4xl">🌍</span> Global Cinema Explorer
        </h2>
        <p className="text-text-secondary text-sm max-w-sm">
          Click on a colored region to explore its cinematic universe.
        </p>
      </div>

      <ComposableMap 
        projection="geoMercator" 
        height={600}
        projectionConfig={{ scale: 120, center: [0, 30] }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryId = geo.id; // ISO3
                const cinemaInfo = CINEMA_DATA[countryId];
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    fill={cinemaInfo ? cinemaInfo.color : "var(--bg-surface)"}
                    style={{
                      default: { outline: "none", transition: "all 300ms ease" },
                      hover: {
                        fill: cinemaInfo ? cinemaInfo.hover : "var(--border)",
                        outline: "none",
                        cursor: cinemaInfo ? "pointer" : "default"
                      },
                      pressed: { outline: "none" }
                    }}
                    onMouseEnter={(e) => {
                      if (cinemaInfo) {
                        setTooltipData({
                          x: e.clientX,
                          y: e.clientY,
                          content: { name: geo.properties.name, ...cinemaInfo }
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (cinemaInfo && tooltipData) {
                        setTooltipData({ ...tooltipData, x: e.clientX, y: e.clientY });
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

      {/* Custom Tooltip */}
      {tooltipData && (
        <div
          className="fixed z-50 pointer-events-none bg-black/80 backdrop-blur-md border border-white/10 px-4 py-3 rounded-lg shadow-xl"
          style={{ top: tooltipData.y + 15, left: tooltipData.x + 15 }}
        >
          <div className="font-bold text-white text-lg mb-1 flex items-center justify-between">
            {tooltipData.content.name}
            <span className="text-xs font-normal text-text-muted bg-surface px-1.5 py-0.5 rounded uppercase">
              {tooltipData.content.region}
            </span>
          </div>
          <div className="text-sm text-text-secondary">
            <span className="font-semibold text-accent">{tooltipData.content.count.toLocaleString()}</span> Films in Database
          </div>
          <div className="text-sm text-text-secondary mt-1 border-t border-border pt-1">
            Top Pick: <span className="text-white italic">{tooltipData.content.topMovie}</span>
          </div>
        </div>
      )}
    </div>
  );
}
