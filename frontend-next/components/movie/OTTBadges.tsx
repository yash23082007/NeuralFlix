import React from 'react';
import Image from 'next/image';

const STREAMING_PLATFORMS: Record<string, {name: string, color: string, src: string}> = {
  "netflix": { name: "Netflix", color: "#E50914", src: "/logos/netflix.svg" },
  "prime": { name: "Prime Video", color: "#00A8E0", src: "/logos/prime.svg" },
  "hotstar": { name: "Disney+ Hotstar", color: "#1F2336", src: "/logos/hotstar.svg" },
  "jiocinema": { name: "JioCinema", color: "#2B6CB0", src: "/logos/jio.svg" },
  "mubi": { name: "MUBI", color: "#0F0F0F", src: "/logos/mubi.svg" },
};

interface OTTBadgesProps {
  platforms?: string[];
  ottGlobal?: Record<string, string[]>;
  userRegion?: string;
}

export function OTTBadges({ platforms, ottGlobal, userRegion = "IN" }: OTTBadgesProps) {
  // Extract platforms based on global JSONB map or fallback to localized array
  let available: string[] = [];
  
  if (ottGlobal && ottGlobal[userRegion]) {
      available = ottGlobal[userRegion];
  } else if (platforms) {
      available = platforms;
  }

  if (!available || available.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-4">
      <span className="text-sm text-zinc-400 font-medium">Available on:</span>
      <div className="flex flex-wrap gap-2">
        {available.map((pid) => {
          const plat = STREAMING_PLATFORMS[pid.toLowerCase()] || { name: pid, color: "#444" };
          return (
            <span 
              key={pid}
              className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: plat.color }}
            >
              {plat.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
