"use client";

import { useEffect } from "react";

export default function KeepAlive() {
  useEffect(() => {
    // Ping the backend every 4 minutes (240000 ms) to prevent Render free tier from sleeping.
    const interval = setInterval(() => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/v1/metrics/health`)
        .catch(() => {});
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
