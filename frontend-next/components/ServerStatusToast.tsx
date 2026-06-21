"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, Zap, RefreshCcw, AlertTriangle } from "lucide-react";

export default function ServerStatusToast() {
  const [status, setStatus] = useState<"hidden" | "waking" | "online" | "error">("hidden");

  useEffect(() => {
    let isMounted = true;
    let wakeTimeout: NodeJS.Timeout;

    const checkHealth = async () => {
      // If health check takes >2s, assume it's waking up
      wakeTimeout = setTimeout(() => {
        if (isMounted && status !== "online") {
          setStatus("waking");
        }
      }, 2000);

      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/health`);
        if (res.ok && isMounted) {
          clearTimeout(wakeTimeout);
          if (status === "waking") {
            setStatus("online");
            setTimeout(() => {
              if (isMounted) setStatus("hidden");
            }, 3000);
          } else {
            setStatus("hidden");
          }
        } else {
          throw new Error("Bad health response");
        }
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          // Try again in 10s
          setTimeout(checkHealth, 10000);
        }
      }
    };

    checkHealth();

    return () => {
      isMounted = false;
      clearTimeout(wakeTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {status !== "hidden" && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-elevated)] p-4 shadow-2xl border border-[var(--border-subtle)] backdrop-blur-xl">
            <div className="flex-shrink-0">
              {status === "waking" && (
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
                  <RefreshCcw className="h-5 w-5 animate-spin-slow" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-warm)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-warm)]"></span>
                  </span>
                </div>
              )}
              {status === "online" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                  <Zap className="h-5 w-5" />
                </div>
              )}
              {status === "error" && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col">
              {status === "waking" && (
                <>
                  <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                    Waking up AI Engine
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Free tier server takes ~50s to start.
                  </span>
                </>
              )}
              {status === "online" && (
                <>
                  <span className="text-sm font-bold text-green-500 tracking-tight">
                    Systems Online
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Engine is ready and connected.
                  </span>
                </>
              )}
              {status === "error" && (
                <>
                  <span className="text-sm font-bold text-red-500 tracking-tight">
                    Connection Error
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Could not reach the backend. Retrying...
                  </span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
