"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Movie, Star, Brain, RefreshCw, User, Settings, Sliders, CheckCircle2, Bookmark } from "lucide-react";
import { getUser, authFetch, isAuthenticated } from "../../lib/auth";
import TasteDNA from "../../components/TasteDNA";
import MovieCard from "../../components/MovieCard";
import TasteConstellation from "../../components/recommendation/TasteConstellation";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUserState] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [editName, setEditName] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dna" | "taste_controls" | "watchlist" | "history" | "settings">("dna");
  const [stats, setStats] = useState({
    watched_count: 0,
    rated_count: 0,
    watchlist_count: 0,
    average_rating: null as number | null
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const currentUser = getUser();
    setUserState(currentUser);
    if (currentUser) {
      setEditName(currentUser.name || "");
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const [profileRes, historyRes, statsRes, watchlistRes] = await Promise.all([
        authFetch(`${API}/api/v1/users/me/profile`),
        authFetch(`${API}/api/v1/users/me/history`),
        authFetch(`${API}/api/v1/users/me/stats`),
        authFetch(`${API}/api/v1/users/me/watchlist`),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile || data);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlist(data.watchlist || []);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API}/api/v1/users/me`, {
        method: "PUT",
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setSettingsMessage("Profile name updated successfully!");
        const updatedUser = { ...user, name: editName };
        localStorage.setItem("neuralflix_user", JSON.stringify(updatedUser));
        setUserState(updatedUser);
      }
    } catch (err) {
      setSettingsMessage("Failed to update profile.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-primary)]">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] text-[var(--text-primary)] pb-24 pt-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-8">
        {/* User Identity Card */}
        <div className="rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-default)] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] text-2xl font-black text-black shadow-glow">
              {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] font-playfair">
                {user?.name || "Cinephile Explorer"}
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-6 divide-x divide-[var(--border-subtle)]">
            <div className="text-center px-3">
              <div className="text-xl font-bold font-mono text-[var(--accent-warm)]">{stats.watched_count}</div>
              <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Watched</div>
            </div>
            <div className="text-center px-3">
              <div className="text-xl font-bold font-mono text-[var(--accent-warm)]">{stats.watchlist_count}</div>
              <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Saved</div>
            </div>
            <div className="text-center px-3">
              <div className="text-xl font-bold font-mono text-[var(--accent-warm)]">
                {stats.average_rating ? stats.average_rating.toFixed(1) : "—"}
              </div>
              <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Avg Rating</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("dna")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "dna"
                ? "bg-[var(--surface-elevated)] text-[var(--accent-warm)] shadow-sm border border-[var(--border-default)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Brain className="h-4 w-4" />
            Taste Profile Profile
          </button>

          <button
            onClick={() => setActiveTab("taste_controls")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "taste_controls"
                ? "bg-[var(--surface-elevated)] text-[var(--accent-warm)] shadow-sm border border-[var(--border-default)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Taste Profile
          </button>

          <button
            onClick={() => setActiveTab("watchlist")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "watchlist"
                ? "bg-[var(--surface-elevated)] text-[var(--accent-warm)] shadow-sm border border-[var(--border-default)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Bookmark className="h-4 w-4" />
            Watchlist ({watchlist.length})
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-[var(--surface-elevated)] text-[var(--accent-warm)] shadow-sm border border-[var(--border-default)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Movie className="h-4 w-4" />
            Watch History ({history.length})
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "settings"
                ? "bg-[var(--surface-elevated)] text-[var(--accent-warm)] shadow-sm border border-[var(--border-default)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Settings className="h-4 w-4" />
            Account Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "dna" && (
            <div className="rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-default)] p-6 sm:p-8 shadow-xl">
              {profile ? (
                <TasteDNA profile={profile} />
              ) : (
                <div className="py-12 text-center text-xs text-[var(--text-tertiary)]">
                  Interact with movies and adjust your taste controls to calibrate your cinematic profile fingerprint.
                </div>
              )}
            </div>
          )}

          {activeTab === "taste_controls" && (
            <div className="max-w-2xl">
              <TasteConstellation />
            </div>
          )}

          {activeTab === "watchlist" && (
            <div>
              {watchlist.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center text-xs text-[var(--text-tertiary)]">
                  Your watchlist is empty. Save movies from search or recommendation cards.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {watchlist.map((movie) => (
                    <MovieCard key={movie.tmdb_id || movie.id} movie={movie} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center text-xs text-[var(--text-tertiary)]">
                  No watched movies logged yet. Watch events are tracked when you interact with movies.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {history.map((item, idx) => (
                    <MovieCard key={idx} movie={item.movie || item} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-md rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-default)] p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Profile Settings</h2>
              
              {settingsMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{settingsMessage}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-tertiary)] mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-warm)]"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--accent-warm)] px-5 py-2 text-xs font-bold text-black hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  Save Changes
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
