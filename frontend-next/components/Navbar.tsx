"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart3,
  ChevronDown,
  Film,
  Globe2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  X,
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
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  };

  return (
    <nav
      className={`fixed top-3 left-1/2 z-50 w-[95%] max-w-7xl -translate-x-1/2 rounded-lg border transition-all duration-300 ${
        scrolled
          ? "border-border bg-surface/88 px-4 py-1 shadow-card backdrop-blur-xl"
          : "border-border/70 bg-surface/72 px-5 py-2 backdrop-blur-xl"
      }`}
    >
      <div className="flex h-13 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neural-crimson text-sm font-black text-white">
            N
          </div>
          <span className="hidden text-lg font-black text-text-primary sm:block">
            Neural<span className="text-accent">Flix</span> ML
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link className="nav-link" href="/">
            <Film className="h-4 w-4" />
            Recommender
          </Link>
          <Link className="nav-link" href="/discover">
            <BarChart3 className="h-4 w-4" />
            Explore
          </Link>
          <div className="relative">
            <button className="nav-link" onClick={() => setCinemaOpen((open) => !open)}>
              <Globe2 className="h-4 w-4" />
              Cinema
              <ChevronDown className={`h-3 w-3 transition-transform ${cinemaOpen ? "rotate-180" : ""}`} />
            </button>
            {cinemaOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCinemaOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 grid w-72 grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-2 shadow-card">
                  {CINEMA_REGIONS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setCinemaOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    >
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-black text-text-muted">
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
            className="hidden items-center gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary sm:flex"
          >
            <Search className="h-4 w-4" />
            Search
          </button>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {mounted &&
            (loggedIn ? (
              <div className="relative group">
                <button className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-black text-black">
                  {userName.charAt(0) || "U"}
                </button>
                <div className="invisible absolute right-0 top-full mt-2 w-40 rounded-lg border border-border bg-surface py-2 opacity-0 shadow-card transition-all group-hover:visible group-hover:opacity-100">
                  <button
                    onClick={() => {
                      logout();
                      setLoggedIn(false);
                    }}
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
                className="hidden items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-bold text-black transition-colors hover:bg-imdb-gold-dark sm:flex"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            ))}

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-md p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border py-3 md:hidden">
          <div className="grid gap-1">
            {[
              { href: "/", label: "Recommender" },
              { href: "/discover", label: "Explore" },
              { href: "/world-map", label: "Map" },
              { href: "/search", label: "Search" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
