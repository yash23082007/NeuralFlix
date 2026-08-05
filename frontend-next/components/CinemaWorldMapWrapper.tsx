"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CinemaWorldMap = dynamic(() => import("./CinemaWorldMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="flex h-[360px] items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50">
      <div className="h-20 w-20 animate-pulse rounded-full border border-[var(--border-default)]" />
    </div>
  );
}

function StaticMapFallback() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-warm)]">
        Lightweight mode
      </p>
      <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
        Explore cinema by region
      </h3>
      <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
        Browse regional cinema trails without loading the interactive globe.
      </p>
      <Link
        href="/world-map"
        className="mt-5 rounded-lg bg-[var(--accent-warm)] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black"
      >
        Open Map
      </Link>
    </div>
  );
}

export default function CinemaWorldMapWrapper() {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [lowEndDevice, setLowEndDevice] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLowEndDevice(
      reducedMotion ||
      (nav.hardwareConcurrency ?? 8) <= 4 ||
      (nav.deviceMemory ?? 8) <= 4
    );
  }, []);

  useEffect(() => {
    if (lowEndDevice) return;
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [lowEndDevice]);

  return (
    <div ref={ref}>
      {lowEndDevice ? <StaticMapFallback /> : shouldLoad ? <CinemaWorldMap /> : <MapSkeleton />}
    </div>
  );
}
