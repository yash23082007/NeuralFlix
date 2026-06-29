"use client";

import Link from "next/link";
import { Film, Github, Globe2, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

const CINEMA_LINKS = [
  { name: "Indian Cinema", href: "/cinema/indian" },
  { name: "Korean Cinema", href: "/cinema/korean" },
  { name: "Japanese Cinema", href: "/cinema/japanese" },
  { name: "French Cinema", href: "/cinema/french" },
  { name: "Hollywood", href: "/cinema/hollywood" },
  { name: "Nollywood", href: "/cinema/nollywood" },
];

const FEATURE_LINKS = [
  { name: "Home", href: "/" },
  { name: "Explore", href: "/discover" },
  { name: "Recommendations", href: "/recommendations" },
  { name: "Search", href: "/search" },
];

export default function Footer() {
  return (
    <footer className="mt-auto relative overflow-hidden">
      {/* Top gradient line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[var(--accent-warm)]/[0.02] blur-[100px] rounded-full pointer-events-none" />

      <div className="relative bg-[var(--surface-primary)] border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <ScrollReveal>
            <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
              {/* Brand Column */}
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="mb-4 flex items-center gap-2.5 group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-sm font-bold text-black shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <Film className="h-4 w-4" />
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    Neural<span className="text-[var(--accent-warm)]">Flix</span>
                  </span>
                </Link>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-tertiary)] max-w-xs">
                  ML-powered global cinema discovery platform. Explore films from
                  every corner of the world with personalized recommendations.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  {[
                    { icon: Github, href: "https://github.com", label: "GitHub" },
                    { icon: Mail, href: "mailto:hello@neuralflix.com", label: "Email" },
                  ].map((social) => (
                    <motion.a
                      key={social.label}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      href={social.href}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--accent-warm)] hover:border-[var(--border-accent)] hover:shadow-glow"
                      aria-label={social.label}
                    >
                      <social.icon className="h-4 w-4" />
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Cinema Column */}
              <div>
                <h4 className="mb-5 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Globe2 className="h-4 w-4 text-[var(--accent-warm)]" />
                  Cinema
                </h4>
                <ul className="space-y-3">
                  {CINEMA_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-warm)]"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features Column */}
              <div>
                <h4 className="mb-5 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <Sparkles className="h-4 w-4 text-[var(--accent-warm)]" />
                  Platform
                </h4>
                <ul className="space-y-3">
                  {FEATURE_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-warm)]"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>


            </div>
          </ScrollReveal>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 sm:flex-row">
            <p className="text-xs text-[var(--text-disabled)]">
              &copy; {new Date().getFullYear()} NeuralFlix. All rights reserved.
            </p>
            <p className="text-xs text-[var(--text-disabled)]">
              Powered by TMDB & OMDb APIs • ML Recommendation Engine
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
