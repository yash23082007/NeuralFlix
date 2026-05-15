"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Tv, ExternalLink, Monitor, ShoppingCart, Radio } from "lucide-react";
import {
  getStreamingAvailability,
  type StreamingAvailability,
  type StreamingProvider,
} from "../../lib/api";

/**
 * Streaming Provider Panel — Inspired by JustWatch's "Where to Watch" UX.
 * Shows provider logos organized by type: Stream / Rent / Buy / Free with Ads.
 */
export default function StreamingPanel({
  tmdbId,
  imdbId,
  mediaType = "movie",
}: {
  tmdbId: number;
  imdbId?: string;
  mediaType?: string;
}) {
  const [data, setData] = useState<StreamingAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stream" | "rent" | "buy" | "ads">("stream");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getStreamingAvailability(tmdbId, imdbId, mediaType);
      setData(result);
      // Auto-select first available tab
      if (result?.providers) {
        if (result.providers.stream?.length > 0) setActiveTab("stream");
        else if (result.providers.rent?.length > 0) setActiveTab("rent");
        else if (result.providers.buy?.length > 0) setActiveTab("buy");
        else if (result.providers.ads?.length > 0) setActiveTab("ads");
      }
      setLoading(false);
    }
    load();
  }, [tmdbId, imdbId, mediaType]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-6 w-32 rounded-lg" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-14 w-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.summary.total_providers === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface/50 px-6 py-8 text-center">
        <Monitor className="mx-auto mb-3 h-8 w-8 text-text-muted/40" />
        <p className="text-sm font-semibold text-text-muted">
          Streaming availability not found for your region
        </p>
      </div>
    );
  }

  const tabs = [
    { key: "stream" as const, label: "Stream", icon: Tv, count: data.providers.stream?.length || 0 },
    { key: "rent" as const, label: "Rent", icon: ExternalLink, count: data.providers.rent?.length || 0 },
    { key: "buy" as const, label: "Buy", icon: ShoppingCart, count: data.providers.buy?.length || 0 },
    { key: "ads" as const, label: "Free", icon: Radio, count: data.providers.ads?.length || 0 },
  ].filter((t) => t.count > 0);

  const activeProviders = data.providers[activeTab] || [];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Tv className="h-4 w-4 text-accent" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-text-primary">
            Where to Watch
          </h3>
        </div>
        <span className="text-[10px] font-bold text-text-muted">
          {data.summary.total_providers} providers
        </span>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === tab.key
                ? "bg-accent text-white shadow-sm"
                : "border border-border bg-surface text-text-muted hover:text-text-primary"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                activeTab === tab.key
                  ? "bg-white/20"
                  : "bg-bg-elevated"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {activeProviders.map((provider) => (
          <ProviderCard key={provider.name} provider={provider} />
        ))}
      </div>

      {/* TMDB Attribution */}
      {data.providers.tmdb_link && (
        <p className="text-[10px] text-text-muted">
          Data provided by{" "}
          <a
            href={data.providers.tmdb_link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-accent hover:underline"
          >
            TMDB & JustWatch
          </a>
        </p>
      )}
    </div>
  );
}

function ProviderCard({ provider }: { provider: StreamingProvider }) {
  const Wrapper = provider.deep_link ? "a" : "div";
  const linkProps = provider.deep_link
    ? { href: provider.deep_link, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...linkProps}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition-all hover:border-accent/30 hover:bg-accent/5 hover:shadow-md"
    >
      {provider.logo_url ? (
        <Image
          src={provider.logo_url}
          alt={provider.name}
          width={40}
          height={40}
          className="rounded-lg shadow-sm"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-elevated text-[10px] font-black text-text-muted">
          {provider.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-primary group-hover:text-accent">
          {provider.name}
        </p>
        <div className="flex items-center gap-2">
          {provider.region && (
            <span className="text-[10px] font-semibold text-text-muted">
              {provider.region}
            </span>
          )}
          {provider.price && (
            <span className="text-[10px] font-bold text-accent">
              {provider.price}
            </span>
          )}
        </div>
      </div>
      {provider.deep_link && (
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </Wrapper>
  );
}

/**
 * Inline Streaming Badges — For MovieCard display.
 * Shows up to 3 provider logos in a compact horizontal strip.
 */
export function StreamingBadges({
  providers,
}: {
  providers: string[];
}) {
  if (!providers || providers.length === 0) return null;

  // Map common provider names to abbreviated labels
  const SHORT_NAMES: Record<string, string> = {
    "Netflix": "N",
    "Amazon Prime Video": "P",
    "Disney Plus": "D+",
    "Disney+": "D+",
    "Hotstar": "HS",
    "JioCinema": "Jio",
    "Zee5": "Z5",
    "Apple TV+": "TV+",
    "Apple TV Plus": "TV+",
    "Hulu": "H",
    "HBO Max": "HBO",
    "Max": "Max",
    "Paramount+": "P+",
    "Peacock": "🦚",
    "Crunchyroll": "CR",
    "MUBI": "M",
    "Sony LIV": "SL",
  };

  const COLORS: Record<string, string> = {
    "Netflix": "#E50914",
    "Amazon Prime Video": "#00A8E1",
    "Disney Plus": "#113CCF",
    "Disney+": "#113CCF",
    "Hotstar": "#0C3A6B",
    "Apple TV+": "#000000",
    "Apple TV Plus": "#000000",
    "Hulu": "#1CE783",
    "HBO Max": "#B535F6",
    "Max": "#002BE7",
    "MUBI": "#001E2F",
  };

  return (
    <div className="flex items-center gap-1">
      {providers.slice(0, 3).map((name) => (
        <div
          key={name}
          className="flex h-6 items-center justify-center rounded-md px-1.5 text-[8px] font-black text-white shadow-sm"
          style={{ backgroundColor: COLORS[name] || "#333" }}
          title={name}
        >
          {SHORT_NAMES[name] || name.slice(0, 2).toUpperCase()}
        </div>
      ))}
      {providers.length > 3 && (
        <span className="text-[9px] font-bold text-text-muted">
          +{providers.length - 3}
        </span>
      )}
    </div>
  );
}
