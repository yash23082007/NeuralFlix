"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Search, Film, Menu, X, ChevronDown,
  Sun, Moon, Globe, Map, Sparkles, Command,
  LogIn, MessageCircle, LogOut, User
} from "lucide-react";
import { isAuthenticated, getUser, logout } from "../lib/auth";

const CINEMA_REGIONS = [
  { name: "Bollywood",  href: "/cinema/bollywood",  flag: "🇮🇳", accent: "text-[#FF6B35]" },
  { name: "Tollywood",  href: "/cinema/tollywood",  flag: "🇮🇳", accent: "text-[#F39C12]" },
  { name: "Kollywood",  href: "/cinema/kollywood",  flag: "🇮🇳", accent: "text-[#E74C3C]" },
  { name: "Mollywood",  href: "/cinema/mollywood",  flag: "🇮🇳", accent: "text-[#27AE60]" },
  { divider: true, label: "World Cinema" },
  { name: "Korean",     href: "/cinema/korean",     flag: "🇰🇷", accent: "text-[#4A90D9]" },
  { name: "Japanese",   href: "/cinema/japanese",   flag: "🇯🇵", accent: "text-[#C0392B]" },
  { name: "French",     href: "/cinema/french",     flag: "🇫🇷", accent: "text-[#6C5CE7]" },
  { name: "Hollywood",  href: "/cinema/hollywood",  flag: "🇺🇸", accent: "text-[#F5A623]" },
  { name: "Spanish",    href: "/cinema/spanish",    flag: "🇪🇸", accent: "text-[#E74C3C]" },
  { name: "Nollywood",  href: "/cinema/nollywood",  flag: "🇳🇬", accent: "text-[#F39C12]" },
  { name: "Iranian",    href: "/cinema/iranian",    flag: "🇮🇷", accent: "text-[#27AE60]" },
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
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      id="navbar"
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 transition-all duration-500 rounded-full ${
        scrolled
          ? "glass-card shadow-card py-1 px-4"
          : "bg-surface/50 backdrop-blur-md border border-border/50 shadow-lg py-2 px-6"
      }`}
    >
      <div className="h-14 flex items-center justify-between gap-4">
        {/* ── Logo ───────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-neural-crimson text-white font-black text-sm">
            N
          </div>
          <span className="font-heading font-bold text-xl text-text-primary hidden sm:block">
            Neural<span className="text-accent">Flix</span>
          </span>
        </Link>

        {/* ── Desktop Navigation ─────────────── */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="nav-link px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-glass"
          >
            Home
          </Link>

          {/* Cinema Dropdown */}
          <div className="relative">
            <button
              onClick={() => setCinemaOpen(!cinemaOpen)}
              className="nav-link px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-glass flex items-center gap-1"
            >
              <Globe className="w-4 h-4" />
              Cinema
              <ChevronDown className={`w-3 h-3 transition-transform ${cinemaOpen ? "rotate-180" : ""}`} />
            </button>

            {cinemaOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCinemaOpen(false)} />
                <div className="absolute top-full left-0 z-50 mt-2 w-60 bg-surface border border-border rounded-xl shadow-xl overflow-hidden py-2">
                  {CINEMA_REGIONS.map((item, i) =>
                    'divider' in item && item.divider ? (
                      <div key={i} className="px-4 py-2 text-[10px] font-bold uppercase text-text-muted tracking-widest mt-2 border-t border-border">
                        {item.label}
                      </div>
                    ) : (
                      <Link
                        key={i}
                        href={(item as any).href}
                        onClick={() => setCinemaOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                      >
                        <span className="text-lg">{(item as any).flag}</span>
                        <span className={(item as any).accent}>{(item as any).name}</span>
                      </Link>
                    )
                  )}
                  <div className="border-t border-border mt-2">
                    <Link
                      href="/world-map"
                      onClick={() => setCinemaOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-accent hover:bg-bg-elevated transition-colors"
                    >
                      <Map className="w-4 h-4" />
                      Cinema World Map
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          <Link
            href="/discover"
            className="nav-link px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-glass flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
            Discover
          </Link>

          <Link
            href="/world-map"
            className="nav-link px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-glass flex items-center gap-1"
          >
            <Map className="w-4 h-4" />
            Map
          </Link>

          <Link
            href="/chat"
            className="nav-link px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-glass flex items-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            AI Chat
          </Link>
        </div>

        {/* ── Right Actions ──────────────────── */}
        <div className="flex items-center gap-2">
          {/* Search Trigger (Cmd+K) */}
          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true });
              document.dispatchEvent(event);
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary hover:border-accent/40 transition-all text-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="hidden lg:inline text-[10px] font-mono bg-bg-elevated px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-all"
              title={`Switch to ${theme === "dark" ? "Premiere" : "Cinema"} mode`}
              id="theme-toggle"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Auth Button */}
          {mounted && (
            loggedIn ? (
              <div className="relative group">
                <button className="w-8 h-8 rounded-full bg-accent text-black font-bold text-sm flex items-center justify-center">
                  {userName.charAt(0) || "U"}
                </button>
                <div className="absolute right-0 top-full mt-2 w-40 bg-surface border border-border rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button
                    onClick={() => { logout(); setLoggedIn(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-accent text-black font-semibold text-sm rounded-lg hover:bg-accent/90 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
            )
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-text-muted hover:text-text-primary"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {[
              { href: "/", label: "Home", icon: <Film className="w-4 h-4" /> },
              { href: "/discover", label: "Discover", icon: <Sparkles className="w-4 h-4" /> },
              { href: "/world-map", label: "Cinema World Map", icon: <Map className="w-4 h-4" /> },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            <div className="border-t border-border pt-3 mt-3">
              <p className="text-[10px] font-bold uppercase text-text-muted tracking-widest px-3 mb-2">Cinema Regions</p>
              <div className="grid grid-cols-2 gap-1">
                {CINEMA_REGIONS.filter(r => !('divider' in r)).map((r, i) => (
                  <Link
                    key={i}
                    href={(r as any).href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface rounded-lg transition-colors"
                  >
                    <span>{(r as any).flag}</span>
                    <span>{(r as any).name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
