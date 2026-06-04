"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Film, Clock, Star, BarChart3, Brain, CalendarDays, Activity, Globe, Compass, RefreshCw, Trash2, Heart, User, Settings, Save, List, ShieldCheck } from "lucide-react";
import { getUser, authFetch, isAuthenticated } from "../../lib/auth";
import TasteDNA from "../../components/TasteDNA";
import MovieCard from "../../components/MovieCard";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUserState] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  
  // Settings form
  const [editName, setEditName] = useState("");
  const [editLang, setEditLang] = useState("en");
  const [editRegion, setEditRegion] = useState("hollywood");
  const [settingsMessage, setSettingsMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "watchlist" | "favorites" | "ratings" | "settings">("history");
  const [stats, setStats] = useState({
    films_watched: 0,
    hours_watched: 0,
    avg_rating: 0,
    countries_watched: 0
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
      const currentUser = getUser();
      if (!currentUser) return;
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const [profileRes, historyRes, statsRes, watchlistRes, favoritesRes, ratingsRes] = await Promise.all([
        authFetch(`${API}/api/v1/users/${currentUser.id}/profile`),
        authFetch(`${API}/api/v1/users/${currentUser.id}/history`),
        authFetch(`${API}/api/v1/users/${currentUser.id}/stats`),
        authFetch(`${API}/api/v1/users/${currentUser.id}/watchlist?limit=50`),
        authFetch(`${API}/api/v1/users/${currentUser.id}/favorites`),
        authFetch(`${API}/api/v1/users/${currentUser.id}/ratings`)
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile || data);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history || data.results || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (watchlistRes.ok) {
        const data = await watchlistRes.json();
        setWatchlist(data.results || []);
      }
      if (favoritesRes.ok) {
        const data = await favoritesRes.json();
        setFavorites(data.results || []);
      }
      if (ratingsRes.ok) {
        const data = await ratingsRes.json();
        setUserRatings(data.ratings || {});
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
      const res = await authFetch(`${API}/api/v1/auth/me`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          preferred_language: editLang,
          region: editRegion
        })
      });
      if (res.ok) {
        setSettingsMessage("Profile updated successfully!");
        // Update user state in storage
        const updatedUser = { ...user, name: editName };
        localStorage.setItem("neuralflix_user", JSON.stringify(updatedUser));
        setUserState(updatedUser);
      } else {
        setSettingsMessage("Failed to update profile settings.");
      }
    } catch (err) {
      setSettingsMessage("An error occurred during update.");
    }
  };

  const handleRemoveFromWatchlist = async (movieId: string) => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API}/api/v1/users/${user.id}/watchlist/${movieId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((m) => String(m.tmdb_id) !== String(movieId)));
        // Refresh stats
        const statsRes = await authFetch(`${API}/api/v1/users/${user.id}/stats`);
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (movieId: string) => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API}/api/v1/users/${user.id}/favorites/${movieId}`, {
        method: "POST"
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((m) => String(m.tmdb_id) !== String(movieId)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute ratings distribution
  const ratingsDistribution = Array.from({ length: 10 }).map((_, i) => {
    const star = i + 1;
    const count = Object.values(userRatings).filter((r) => Math.round(r) === star).length;
    return { star, count };
  });
  const maxRatingCount = Math.max(...ratingsDistribution.map((d) => d.count), 1);

  // Avatar Initials
  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="min-h-screen bg-black text-[#e5e2e3] font-sans pt-28 pb-20 relative overflow-hidden">
      {/* Aurora Ambient */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 h-[600px] w-[600px] rounded-full bg-radial from-[var(--accent-warm)]/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-radial from-[var(--accent-rose)]/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: "-3s" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-12 space-y-12">
        {/* Profile Header */}
        <header className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-8 border-b border-zinc-900">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[var(--accent-warm)] to-[var(--accent-rose)] flex items-center justify-center text-black text-3xl font-black shadow-[0_0_24px_rgba(232,168,73,0.3)]">
              {user ? getInitials(user.name || user.email) : "?"}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-3xl font-black font-playfair tracking-tight text-white">{user?.name || "Curator"}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> VERIFIED
                </span>
              </div>
              <p className="text-sm text-zinc-400 font-mono">{user?.email}</p>
              <p className="text-xs text-zinc-500">Member since June 2026</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" /> Edit Profile
          </button>
        </header>

        {/* Stats Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
              <Film className="h-3.5 w-3.5 text-[var(--accent-warm)]" /> Films Watched
            </span>
            <span className="text-3xl font-black text-white">{loading ? "..." : stats.films_watched}</span>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
              <Clock className="h-3.5 w-3.5 text-[var(--accent-warm)]" /> Hours Watched
            </span>
            <span className="text-3xl font-black text-white">{loading ? "..." : stats.hours_watched}</span>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
              <Star className="h-3.5 w-3.5 text-[var(--accent-warm)]" /> Avg Rating
            </span>
            <span className="text-3xl font-black text-white">{loading ? "..." : stats.avg_rating > 0 ? `${stats.avg_rating.toFixed(1)} / 10` : "0.0"}</span>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
              <Globe className="h-3.5 w-3.5 text-[var(--accent-warm)]" /> Regions Explored
            </span>
            <span className="text-3xl font-black text-white">{loading ? "..." : stats.countries_watched}</span>
          </div>
        </section>

        {/* Taste DNA Radar Render */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-[var(--accent-warm)]" />
            <h2 className="text-lg font-bold tracking-tight text-white uppercase font-mono">Taste Fingerprint Mapping</h2>
          </div>
          <TasteDNA profile={profile} loading={loading} />
        </section>

        {/* Tab Navigation */}
        <section className="space-y-6">
          <div className="border-b border-zinc-900">
            <div className="flex overflow-x-auto gap-8 pb-3">
              {[
                { id: "history", label: "History Log", icon: CalendarDays },
                { id: "watchlist", label: `Watchlist (${watchlist.length})`, icon: List },
                { id: "favorites", label: `Favorites (${favorites.length})`, icon: Heart },
                { id: "ratings", label: "Ratings Profile", icon: BarChart3 },
                { id: "settings", label: "Settings", icon: Settings }
              ].map((tab) => {
                const IconComponent = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider pb-1 relative cursor-pointer whitespace-nowrap transition-colors ${
                      active ? "text-[var(--accent-warm)]" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                    {active && (
                      <span className="absolute bottom-[-13px] inset-x-0 h-0.5 bg-[var(--accent-warm)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Contents */}
          <div className="min-h-[250px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-warm)]" />
              </div>
            ) : (
              <>
                {/* 1. History Tab */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    {history.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {history.map((m, i) => (
                          <div
                            key={i}
                            className="flex gap-4 p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 hover:border-zinc-800 transition-all"
                          >
                            <div className="h-16 w-12 rounded-md bg-zinc-900 overflow-hidden flex-shrink-0">
                              {m.poster_url ? (
                                <img src={m.poster_url} alt={m.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Film className="h-4 w-4 text-zinc-700" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-grow">
                              <h4 className="text-sm font-bold text-white truncate">{m.title}</h4>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {m.genres?.slice(0, 2).join(", ") || "Drama"}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[10px]">
                                {m.rating && (
                                  <span className="inline-flex items-center gap-1 text-[var(--accent-warm)] font-bold">
                                    <Star className="h-3 w-3 fill-current" />
                                    {m.rating} Rated
                                  </span>
                                )}
                                {m.runtime && (
                                  <span className="text-zinc-500 font-mono">
                                    {m.runtime} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 border border-dashed border-zinc-900 rounded-2xl">
                        <Film className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">No Viewing Log</h4>
                        <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto leading-relaxed">
                          Your watch history is currently empty. Rate movies to construct your profile.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Watchlist Tab */}
                {activeTab === "watchlist" && (
                  <div>
                    {watchlist.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {watchlist.map((movie) => (
                          <div key={movie.tmdb_id} className="relative group">
                            <MovieCard movie={movie} />
                            <button
                              onClick={() => handleRemoveFromWatchlist(movie.tmdb_id)}
                              className="absolute top-2 right-2 p-2 rounded-xl bg-black/80 hover:bg-[var(--accent-rose)] border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100 z-30"
                              title="Remove from Watchlist"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 border border-dashed border-zinc-900 rounded-2xl">
                        <List className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Watchlist Empty</h4>
                        <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto leading-relaxed">
                          Start exploring movies and add them to your watchlist for custom predictions.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Favorites Tab */}
                {activeTab === "favorites" && (
                  <div>
                    {favorites.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {favorites.map((movie) => (
                          <div key={movie.tmdb_id} className="relative group">
                            <MovieCard movie={movie} />
                            <button
                              onClick={() => handleToggleFavorite(movie.tmdb_id)}
                              className="absolute top-2 right-2 p-2 rounded-xl bg-black/80 hover:bg-[var(--accent-rose)] border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer opacity-0 group-hover:opacity-100 z-30"
                              title="Remove from Favorites"
                            >
                              <Heart className="h-4 w-4 fill-current text-[var(--accent-rose)]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 border border-dashed border-zinc-900 rounded-2xl">
                        <Heart className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">No Favorites Marked</h4>
                        <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto leading-relaxed">
                          Mark outstanding movies as favorites to pin them in your custom profile.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Ratings Tab */}
                {activeTab === "ratings" && (
                  <div className="space-y-8 max-w-2xl">
                    <div className="bg-zinc-950/40 border border-zinc-900 p-6 rounded-2xl">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-6">Star Rating Distribution</h3>
                      <div className="space-y-3.5">
                        {ratingsDistribution.reverse().map((dist) => {
                          const percentage = (dist.count / maxRatingCount) * 100;
                          return (
                            <div key={dist.star} className="flex items-center gap-3">
                              <span className="w-12 text-xs font-semibold text-zinc-400 flex items-center justify-end gap-1">
                                {dist.star} <Star className="h-3 w-3 fill-current text-[var(--accent-warm)]" />
                              </span>
                              <div className="flex-grow h-3 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[var(--accent-warm)] to-[var(--accent-rose)] rounded-full transition-all duration-1000"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="w-8 text-right text-xs font-bold text-zinc-500 font-mono">{dist.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Settings Tab */}
                {activeTab === "settings" && (
                  <div className="max-w-xl bg-zinc-950/40 border border-zinc-900 p-8 rounded-2xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-6 flex items-center gap-2">
                      <User className="h-4 w-4" /> Personal Customization
                    </h3>
                    
                    <form onSubmit={handleUpdateSettings} className="space-y-6">
                      {settingsMessage && (
                        <div className={`p-3.5 rounded-xl text-xs font-bold ${
                          settingsMessage.includes("success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/20 text-[var(--accent-rose)]"
                        }`}>
                          {settingsMessage}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Display Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-[var(--accent-warm)] transition-colors"
                          placeholder="Your Display Name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Preferred Language</label>
                        <select
                          value={editLang}
                          onChange={(e) => setEditLang(e.target.value)}
                          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-warm)] transition-colors"
                        >
                          <option value="en">English</option>
                          <option value="hi">Hindi</option>
                          <option value="ko">Korean</option>
                          <option value="ja">Japanese</option>
                          <option value="fr">French</option>
                          <option value="es">Spanish</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cinema Region Focus</label>
                        <select
                          value={editRegion}
                          onChange={(e) => setEditRegion(e.target.value)}
                          className="w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent-warm)] transition-colors"
                        >
                          <option value="hollywood">Hollywood</option>
                          <option value="bollywood">Bollywood</option>
                          <option value="korean">Korean Cinema</option>
                          <option value="japanese">Japanese Cinema</option>
                          <option value="french">French Cinema</option>
                          <option value="tamil">Tamil Cinema</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-warm)] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_16px_rgba(232,168,73,0.15)] cursor-pointer"
                      >
                        <Save className="h-4 w-4" /> Save Profile
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

