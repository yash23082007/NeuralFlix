import Link from "next/link";
import { BarChart3, Film, Github, Globe2, Mail, Sparkles } from "lucide-react";

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
  { name: "Preference Signals", href: "/mood" },
  { name: "World Map", href: "/world-map" },
  { name: "Search", href: "/search" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-neural-purple text-sm font-bold text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-text-primary">
                Neural<span className="text-accent">Flix</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-muted max-w-xs">
              AI-powered global cinema discovery platform. Explore films from every corner of the world with intelligent recommendations.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="https://github.com" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted transition-all hover:bg-bg-elevated hover:text-text-primary" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="mailto:hello@neuralflix.com" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted transition-all hover:bg-bg-elevated hover:text-text-primary" aria-label="Email">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-5 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Globe2 className="h-4 w-4 text-accent" />
              Cinema
            </h4>
            <ul className="space-y-3">
              {CINEMA_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted transition-colors hover:text-text-primary">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 flex items-center gap-2 text-sm font-bold text-text-primary">
              <Film className="h-4 w-4 text-accent" />
              App
            </h4>
            <ul className="space-y-3">
              {FEATURE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted transition-colors hover:text-text-primary">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 flex items-center gap-2 text-sm font-bold text-text-primary">
              <BarChart3 className="h-4 w-4 text-accent" />
              Stack
            </h4>
            <ul className="space-y-3 text-sm text-text-muted">
              <li>FastAPI + Python</li>
              <li>Next.js 15 + React 19</li>
              <li>Tailwind CSS v4</li>
              <li>TF-IDF + Hybrid ML</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} NeuralFlix. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            Powered by TMDB & OMDb APIs
          </p>
        </div>
      </div>
    </footer>
  );
}
