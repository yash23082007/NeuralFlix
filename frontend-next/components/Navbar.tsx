"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart3, ChevronDown, Film, Globe2, LogIn, LogOut, Menu, Moon, Search, Sun, X, Sparkles,
} from "lucide-react";
import { getUser, isAuthenticated, logout } from "../lib/auth";

const CINEMA_REGIONS = [
  { name: "Indian", href: "/cinema/indian", code: "IN", accent: "text-[#FF6B35]" },
  { name: "Bollywood", href: "/cinema/bollywood", code: "HI", accent: "text-[#FF6B35]" },
  { name: "Tollywood", href: "/cinema/tollywood", code: "TE", accent: "text-[#F39C12]" },
  { name: "Korean", href: "/cinema/korean", code: "KR", accent: "text-[#4A90D9]" },
  { name: "Japanese", href: "/cinema/japanese", code: "JP", accent: "text-[#C0392B]" },
  { name: "French", href: "/cinema/french", code: "FR", accent: "text-[#6C5CE7]" },
  { name: "Hollywood", href: "/cinema/hollywood", code: "US", accent: "text-[#F5A623]" },
  { name: "Spanish", href: "/cinema/spanish", code: "ES", accent: "text-[#E74C3C]" },
  { name: "Nollywood", href: "/cinema/nollywood", code: "NG", accent: "text-[#F39C12]" },
  { name: "Iranian", href: "/cinema/iranian", code: "IR", accent: "text-[#27AE60]" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isAuthenticated());
    const user = getUser();
    if (user?.name) setUserName(user.name);
    else if (user?.email) setUserName(user.email.charAt(0).toUpperCase());
  }, []);

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  };

  return (
    <>
      {/* Gradient bar at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gradient-to-r from-neural-crimson via-neural-purple to-neural-electric" />

      <nav className="fixed top-3 left-1/2 z-50 w-[94%] max-w-7xl -translate-x-1/2 rounded-2xl border border-glass-border bg-glass shadow-card backdrop-blur-2xl transition-all duration-300">
        <div className="flex h-14 items-center justify-between gap-4 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl premium-gradient text-sm font-black text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="hidden text-lg font-bold tracking-tight text-text-primary sm:block">
              Neural<span className="text-accent">Flix</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link className="nav-link" href="/">
              <Film className="h-4 w-4" />
              Home
            </Link>
            <Link className="nav-link" href="/discover">
              <BarChart3 className="h-4 w-4" />
              Explore
            </Link>
            <div className="relative">
              <button className="nav-link" onClick={() => setCinemaOpen((o) => !o)}>
                <Globe2 className="h-4 w-4" />
                Cinema
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${cinemaOpen ? "rotate-180" : ""}`} />
              </button>
              {cinemaOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCinemaOpen(false)} />
                  <div className="absolute left-0 top-full z-50 mt-2 grid w-72 grid-cols-2 gap-1 rounded-xl border border-glass-border bg-glass p-2 shadow-card backdrop-blur-2xl animate-scale-in">
                    {CINEMA_REGIONS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setCinemaOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                      >
                        <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                          {item.code}
                        </span>
                        <span className={item.accent}>{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link className="nav-link" href="/world-map">
              <Globe2 className="h-4 w-4" />
              Map
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openSearch}
              className="hidden items-center gap-2 rounded-xl border border-glass-border bg-surface px-3.5 py-2 text-sm font-medium text-text-secondary transition-all hover:border-text-muted hover:text-text-primary sm:flex"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="hidden rounded-md border border-glass-border bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted lg:inline">
                Ctrl K
              </kbd>
            </button>

            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            {mounted && (
              loggedIn ? (
                <div className="relative group">
                  <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white shadow-sm transition-transform hover:scale-105">
                    {userName.charAt(0) || "U"}
                  </button>
                  <div className="invisible absolute right-0 top-full mt-2 w-40 rounded-xl border border-glass-border bg-glass py-2 opacity-0 shadow-card backdrop-blur-2xl transition-all group-hover:visible group-hover:opacity-100">
                    <button
                      onClick={() => { logout(); setLoggedIn(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-neural-crimson-dim sm:flex"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )
            )}

            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-glass-border py-3 px-4 md:hidden animate-slide-down">
            <div className="grid gap-1">
              {[
                { href: "/", label: "Home" },
                { href: "/discover", label: "Explore" },
                { href: "/world-map", label: "Map" },
                { href: "/search", label: "Search" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
