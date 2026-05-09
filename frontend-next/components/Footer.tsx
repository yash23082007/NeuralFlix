import Link from "next/link";
import { Film, Globe, Github, Twitter, Mail } from "lucide-react";

const CINEMA_LINKS = [
  { name: "🇮🇳 Indian Cinema", href: "/cinema/indian" },
  { name: "🇰🇷 Korean Cinema", href: "/cinema/korean" },
  { name: "🇯🇵 Japanese Cinema", href: "/cinema/japanese" },
  { name: "🇫🇷 French Cinema", href: "/cinema/french" },
  { name: "🇺🇸 Hollywood", href: "/cinema/hollywood" },
  { name: "🇳🇬 Nollywood", href: "/cinema/nollywood" },
];

const FEATURE_LINKS = [
  { name: "Discover", href: "/discover" },
  { name: "AI Chat", href: "/chat" },
  { name: "Mood Picker", href: "/mood" },
  { name: "World Map", href: "/world-map" },
  { name: "Search", href: "/search" },
];

const ABOUT_LINKS = [
  { name: "API Docs", href: "/docs" },
  { name: "GitHub", href: "https://github.com" },
  { name: "TMDB Attribution", href: "https://www.themoviedb.org" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-neural-crimson text-white font-black text-sm">
                N
              </div>
              <span className="font-heading font-bold text-lg text-text-primary">
                Neural<span className="text-accent">Flix</span>
              </span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed">
              The world&apos;s first truly global cinema discovery platform. AI-powered recommendations from 50+ film traditions.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://github.com" className="text-text-muted hover:text-text-primary transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" className="text-text-muted hover:text-text-primary transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="mailto:hello@neuralflix.com" className="text-text-muted hover:text-text-primary transition-colors" aria-label="Email">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Cinema Regions */}
          <div>
            <h4 className="text-sm font-heading font-bold text-text-primary mb-4 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-accent" />
              Cinema
            </h4>
            <ul className="space-y-2.5">
              {CINEMA_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-heading font-bold text-text-primary mb-4 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-accent" />
              Features
            </h4>
            <ul className="space-y-2.5">
              {FEATURE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-heading font-bold text-text-primary mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {ABOUT_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} NeuralFlix. Built with ❤️ for cinema lovers worldwide.
          </p>
          <p className="text-xs text-text-muted">
            Movie data powered by{" "}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              TMDB
            </a>
            {" "}•{" "}
            <a
              href="https://www.omdbapi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              OMDb
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
