"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Compass,
  Film,
  Globe2,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { getUser, isAuthenticated, logout } from "../lib/auth";

const CINEMA_REGIONS = [
  { name: "Indian", href: "/cinema/indian", code: "IN", accent: "text-orange-400" },
  { name: "Bollywood", href: "/cinema/bollywood", code: "HI", accent: "text-orange-400" },
  { name: "Tollywood", href: "/cinema/tollywood", code: "TE", accent: "text-amber-400" },
  { name: "Korean", href: "/cinema/korean", code: "KR", accent: "text-blue-400" },
  { name: "Japanese", href: "/cinema/japanese", code: "JP", accent: "text-red-400" },
  { name: "French", href: "/cinema/french", code: "FR", accent: "text-violet-400" },
  { name: "Hollywood", href: "/cinema/hollywood", code: "US", accent: "text-amber-300" },
  { name: "Spanish", href: "/cinema/spanish", code: "ES", accent: "text-red-400" },
  { name: "Nollywood", href: "/cinema/nollywood", code: "NG", accent: "text-amber-400" },
  { name: "Iranian", href: "/cinema/iranian", code: "IR", accent: "text-emerald-400" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(isAuthenticated());
    const user = getUser();
    if (user?.name) setUserName(user.name);
    else if (user?.email) setUserName(user.email.charAt(0).toUpperCase());
    setIsAdmin(!!user?.is_admin);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openSearch = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
    );
  };

  return (
    <>
      {/* Thin accent line */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-gradient-to-r from-[var(--accent-warm)] via-[var(--accent-rose)] to-[var(--accent-warm)]" />

      <nav
        className={`fixed top-[2px] left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[var(--surface-primary)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between gap-4 px-5 md:px-8">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-sm font-black text-black shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Film className="h-4 w-4" />
            </div>
            <span className="hidden text-lg font-semibold tracking-tight text-[var(--text-primary)] sm:block">
              Neural<span className="text-[var(--accent-warm)]">Flix</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-1 md:flex">
            <Link className="nav-link" href="/">
              Home
            </Link>
            <Link className="nav-link" href="/discover">
              <Compass className="h-3.5 w-3.5" />
              Explore
            </Link>

            {/* Cinema Dropdown */}
            <div className="relative">
              <button
                className="nav-link"
                onClick={() => setCinemaOpen((o) => !o)}
              >
                <Globe2 className="h-3.5 w-3.5" />
                Cinema
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    cinemaOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {cinemaOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setCinemaOpen(false)}
                  />
                  <div className="absolute left-0 top-full z-50 mt-2 grid w-72 grid-cols-2 gap-0.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1.5 shadow-xl animate-scale-in">
                    {CINEMA_REGIONS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setCinemaOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                      >
                        <span className="rounded border border-[var(--border-default)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-tertiary)]">
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
              Map
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search Trigger */}
            <button
              onClick={openSearch}
              className="hidden items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3.5 py-2 text-sm text-[var(--text-secondary)] transition-all hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-[var(--text-tertiary)]">Search films...</span>
              <kbd className="hidden rounded border border-[var(--border-default)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] lg:inline">
                ⌘K
              </kbd>
            </button>

            {/* Auth */}
            {mounted &&
              (loggedIn ? (
                <div className="relative group">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-sm font-bold text-black shadow-sm transition-transform hover:scale-105">
                    {userName.charAt(0) || "U"}
                  </button>
                  <div className="invisible absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] py-1.5 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--accent-warm)] transition-colors hover:bg-[var(--surface-hover)]"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setLoggedIn(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden items-center gap-1.5 rounded-lg bg-[var(--accent-warm)] px-4 py-2 text-sm font-semibold text-black transition-all hover:brightness-110 sm:flex"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              ))}

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] md:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-3 px-4 md:hidden animate-slide-down">
            <div className="grid gap-1">
              {[
                { href: "/", label: "Home" },
                { href: "/discover", label: "Explore" },
                { href: "/world-map", label: "World Map" },
                { href: "/search", label: "Search" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--accent-warm)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
