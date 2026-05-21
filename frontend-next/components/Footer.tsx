import Link from "next/link";
import { Film, Github, Globe2, Mail } from "lucide-react";

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
  { name: "World Map", href: "/world-map" },
  { name: "Search", href: "/search" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-sm font-bold text-black shadow-sm">
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
              <a
                href="https://github.com"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@neuralflix.com"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
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
                    className="text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
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
              <Film className="h-4 w-4 text-[var(--accent-warm)]" />
              Platform
            </h4>
            <ul className="space-y-3">
              {FEATURE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tech Column */}
          <div>
            <h4 className="mb-5 text-sm font-semibold text-[var(--text-primary)]">
              Built With
            </h4>
            <ul className="space-y-3 text-sm text-[var(--text-tertiary)]">
              <li>FastAPI + Python</li>
              <li>Next.js 15 + React 19</li>
              <li>Tailwind CSS v4</li>
              <li>TF-IDF + Hybrid ML</li>
              <li>Collaborative Filtering</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-8 sm:flex-row">
          <p className="text-xs text-[var(--text-disabled)]">
            &copy; {new Date().getFullYear()} NeuralFlix. All rights reserved.
          </p>
          <p className="text-xs text-[var(--text-disabled)]">
            Powered by TMDB & OMDb APIs • ML Recommendation Engine
          </p>
        </div>
      </div>
    </footer>
  );
}
