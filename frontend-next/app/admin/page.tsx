"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, authFetch } from "../../lib/auth";
import { 
  Users, 
  Movie, 
  Activity, 
  Settings, 
  ShieldAlert, 
  Database, 
  ArrowUpRight,
  Loader2,
  Play
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUserState] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingStage, setSyncingStage] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.is_admin) {
      router.push("/");
      return;
    }
    setUserState(currentUser);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/admin/stats`);
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.error("Failed to fetch admin stats");
      }
    } catch (err) {
      console.error("Error fetching admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTrigger = async (stage: string) => {
    setSyncingStage(stage);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await authFetch(`${API}/api/v1/admin/sync/trigger?stage=${stage}`, {
        method: "POST"
      });
      if (res.ok) {
        alert(`Sync job for '${stage}' dispatched in background.`);
        setTimeout(fetchStats, 2000); // refresh stats after a bit
      } else {
        const err = await res.json();
        alert(`Sync failed: ${err.detail || "Unknown error"}`);
      }
    } catch (e) {
      alert("Failed to trigger sync");
    } finally {
      setSyncingStage(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const db = stats?.database || {};

  return (
    <main className="min-h-screen bg-background p-6 pt-24 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-accent mb-2">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Admin Control Center</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-text-primary">
              System Dashboard
            </h1>
            <p className="mt-2 text-text-muted">Welcome back, {user?.name || "Admin"}. System status is {stats?.status || "unknown"}.</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={fetchStats}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-all hover:border-accent/50">
              <Activity className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: (db.users || 0).toLocaleString(), icon: Users, color: "blue" },
            { label: "Catalog Size", value: (db.movies || 0).toLocaleString(), icon: Movie, color: "purple" },
            { label: "Watch Events", value: (db.watch_events || 0).toLocaleString(), icon: Activity, color: "green" },
            { label: "Ratings", value: (db.ratings || 0).toLocaleString(), icon: Database, color: "orange" },
            { label: "Watchlist Items", value: (db.watchlist_items || 0).toLocaleString(), icon: Movie, color: "red" },
            { label: "Search Queries", value: (db.search_queries || 0).toLocaleString(), icon: Database, color: "indigo" },
            { label: "Feedbacks", value: (db.feedback_rows || 0).toLocaleString(), icon: Users, color: "pink" },
            { label: "Impressions", value: (db.impressions || 0).toLocaleString(), icon: Activity, color: "teal" },
          ].map((item, idx) => (
            <div key={idx} className="premium-card group relative overflow-hidden rounded-2xl p-6 transition-all hover:border-accent/30">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-text-muted">{item.label}</p>
                  <h3 className="mt-1 text-3xl font-black text-text-primary">{item.value}</h3>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${item.color}-500/10 text-${item.color}-500`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              {/* Background accent */}
              <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${item.color}-500/5 blur-2xl transition-all group-hover:bg-${item.color}-500/10`} />
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="premium-card rounded-2xl p-6 lg:col-span-2">
            <h3 className="mb-6 text-lg font-bold text-text-primary">Ingestion Checkpoints</h3>
            <div className="space-y-6">
              {stats?.checkpoints?.length > 0 ? (
                stats.checkpoints.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-transparent p-2 transition-all hover:border-border hover:bg-surface/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <Database className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-text-primary">Job: {c.job_name}</p>
                      <p className="text-xs text-text-muted">Last Page: {c.last_page} | Status: {c.status}</p>
                    </div>
                    <span className="text-[10px] font-medium text-text-muted">{new Date(c.updated_at).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">No checkpoints found.</p>
              )}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-6">
            <h3 className="mb-6 text-lg font-bold text-text-primary">Quick Actions</h3>
            <div className="space-y-3">
              {["popular", "top_rated", "now_playing"].map((stage) => (
                <button 
                  key={stage}
                  onClick={() => handleSyncTrigger(stage)}
                  disabled={syncingStage === stage}
                  className="w-full flex justify-between items-center rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-text-primary transition-all hover:border-accent/50 hover:bg-accent/5 disabled:opacity-50"
                >
                  Sync '{stage}'
                  {syncingStage === stage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-10 rounded-2xl bg-accent/5 p-6 border border-accent/10">
              <h4 className="font-bold text-accent">System Models</h4>
              {stats?.active_models?.map((m: any, i: number) => (
                <p key={i} className="mt-2 text-xs leading-relaxed text-text-muted">
                  <strong>{m.id}</strong> - {m.tier} ({m.status})
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

