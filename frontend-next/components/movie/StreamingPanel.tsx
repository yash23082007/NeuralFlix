"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Tv, ExternalLink, Monitor, ShoppingCart, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStreamingAvailability,
  type StreamingAvailability,
  type StreamingProvider,
} from "../../lib/api";

/**
 * Streaming Provider Panel — Reconstructed with premium bento tabs and micro-animations.
 * Shows provider logos organized by type: Stream / Rent / Buy / Free.
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
      try {
        const result = await getStreamingAvailability(tmdbId, imdbId, mediaType);
        setData(result);
        if (result?.providers) {
          if (result.providers.stream?.length > 0) setActiveTab("stream");
          else if (result.providers.rent?.length > 0) setActiveTab("rent");
          else if (result.providers.buy?.length > 0) setActiveTab("buy");
          else if (result.providers.ads?.length > 0) setActiveTab("ads");
        }
      } catch (err) {
        console.error("Error loading streaming availability:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tmdbId, imdbId, mediaType]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 rounded-lg bg-[var(--surface-muted)]" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-14 rounded-2xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.summary.total_providers === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/20 px-6 py-10 text-center backdrop-blur-sm">
        <Monitor className="mx-auto mb-3 h-8 w-8 text-[var(--text-tertiary)]/50" />
        <p className="text-sm font-semibold text-[var(--text-secondary)] font-sans">
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
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-warm)]/10">
            <Tv className="h-4 w-4 text-[var(--accent-warm)] animate-pulse" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)] font-sans">
            Where to Watch
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[var(--text-secondary)] font-sans bg-[var(--surface-muted)] px-2.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
          {data.summary.total_providers} {data.summary.total_providers === 1 ? "Provider" : "Providers"}
        </span>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 border cursor-pointer font-sans ${
              activeTab === tab.key
                ? "bg-[var(--accent-warm)] text-black border-[var(--accent-warm)] shadow-[0_0_12px_var(--accent-warm-glow)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-black ${
                activeTab === tab.key
                  ? "bg-black/20 text-black"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Provider Cards */}
      <motion.div 
        layout
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {activeProviders.map((provider) => (
            <motion.div
              key={provider.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProviderCard provider={provider} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* TMDB Attribution */}
      {data.providers.tmdb_link && (
        <p className="text-[10px] text-[var(--text-tertiary)] font-sans">
          Data provided by{" "}
          <a
            href={data.providers.tmdb_link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--accent-warm)] hover:underline"
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
      {...(linkProps as any)}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-overlay)]/40 px-3.5 py-3 transition-all duration-300 hover:border-[var(--accent-warm)]/30 hover:bg-[var(--accent-warm)]/5 hover:shadow-md h-full"
    >
      {provider.logo_url ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm border border-[var(--border-subtle)]">
          <Image
            src={provider.logo_url}
            alt={provider.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[10px] font-bold text-[var(--text-secondary)] font-sans">
          {provider.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-warm)] transition-colors duration-200 font-sans">
          {provider.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {provider.region && (
            <span className="text-[9px] font-medium text-[var(--text-tertiary)] uppercase font-sans">
              {provider.region}
            </span>
          )}
          {provider.price && (
            <span className="text-[9px] font-bold text-[var(--accent-warm)] font-sans">
              • {provider.price}
            </span>
          )}
        </div>
      </div>
      {provider.deep_link && (
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
    "Amazon Prime Video": "Prime",
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
    "Sony LIV": "LIV",
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
          className="flex h-5 items-center justify-center rounded-md px-1.5 text-[8px] font-bold text-white shadow-sm font-sans"
          style={{ backgroundColor: COLORS[name] || "rgba(255,255,255,0.08)", border: COLORS[name] ? "none" : "1px solid var(--border-subtle)" }}
          title={name}
        >
          {SHORT_NAMES[name] || name.slice(0, 2).toUpperCase()}
        </div>
      ))}
      {providers.length > 3 && (
        <span className="text-[9px] font-bold text-[var(--text-secondary)] font-sans">
          +{providers.length - 3}
        </span>
      )}
    </div>
  );
}
