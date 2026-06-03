"use client";

import Link from "next/link";
import { Film, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--surface-primary)] px-6 overflow-hidden">
      {/* Decorative ambient background orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[var(--accent-warm)]/5 blur-3xl pointer-events-none" />

      {/* Floating Film icon */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative z-10 p-4 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--accent-warm)] shadow-lg"
      >
        <Film className="h-10 w-10" />
      </motion.div>

      <div className="relative z-10 text-center space-y-3">
        <h1 className="text-7xl font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)]">
          404
        </h1>
        <h2 className="text-xl font-bold text-[var(--text-primary)] font-playfair">
          Scene Not Found
        </h2>
        <p className="max-w-md text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
          The requested coordinate or reels could not be loaded. It may have been archived or removed from the catalog.
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-warm)] px-6 py-3 text-sm font-semibold text-black transition-all shadow-[0_0_15px_var(--accent-warm-glow)] hover:brightness-110 font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Cinema
        </Link>
      </motion.div>
    </div>
  );
}
