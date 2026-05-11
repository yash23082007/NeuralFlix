import Link from "next/link";
import { BarChart3, Film, Github, Globe2, Mail } from "lucide-react";

const CINEMA_LINKS = [
  { name: "Indian Cinema", href: "/cinema/indian" },
  { name: "Korean Cinema", href: "/cinema/korean" },
  { name: "Japanese Cinema", href: "/cinema/japanese" },
  { name: "French Cinema", href: "/cinema/french" },
  { name: "Hollywood", href: "/cinema/hollywood" },
  { name: "Nollywood", href: "/cinema/nollywood" },
];

const FEATURE_LINKS = [
  { name: "Recommender", href: "/" },
  { name: "Explore", href: "/discover" },
  { name: "Preference Signals", href: "/mood" },
  { name: "World Map", href: "/world-map" },
  { name: "Search", href: "/search" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neural-crimson text-sm font-black text-white">
                N
              </div>
              <span className="text-lg font-black text-text-primary">
                Neural<span className="text-accent">Flix</span> ML
              </span>
            </Link>
            <p className="text-sm leading-6 text-text-muted">
              A global cinema recommender built around hybrid retrieval, ranking, and feedback signals.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="https://github.com" className="text-text-muted transition-colors hover:text-text-primary" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
              <a href="mailto:hello@neuralflix.com" className="text-text-muted transition-colors hover:text-text-primary" aria-label="Email">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-1.5 text-sm font-black text-text-primary">
              <Globe2 className="h-4 w-4 text-accent" />
              Cinema
            </h4>
            <ul className="space-y-2.5">
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
            <h4 className="mb-4 flex items-center gap-1.5 text-sm font-black text-text-primary">
              <Film className="h-4 w-4 text-accent" />
              App
            </h4>
            <ul className="space-y-2.5">
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
            <h4 className="mb-4 flex items-center gap-1.5 text-sm font-black text-text-primary">
              <BarChart3 className="h-4 w-4 text-accent" />
              Stack
            </h4>
            <ul className="space-y-2.5 text-sm text-text-muted">
              <li>FastAPI recommendation API</li>
              <li>Next.js App Router</li>
              <li>MongoDB fallback catalog</li>
              <li>TF-IDF and hybrid ranking</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-text-muted">
            Copyright {new Date().getFullYear()} NeuralFlix ML.
          </p>
          <p className="text-xs text-text-muted">
            Movie metadata compatible with TMDB and OMDb sources.
          </p>
        </div>
      </div>
    </footer>
  );
}
