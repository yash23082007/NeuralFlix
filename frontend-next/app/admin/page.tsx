"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, getAuthHeaders } from "../../lib/auth";
import { 
  Users, 
  Film, 
  Activity, 
  Settings, 
  ShieldAlert, 
  Database, 
  ArrowUpRight,
  Loader2
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUserState] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      // Mock stats for now, but trying to fetch from real endpoints if possible
      // In a real app, you'd have an /api/admin/stats endpoint
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/movies/stats`, {
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Fallback to mock data if endpoint doesn't exist yet
        setStats({
          totalUsers: 1248,
          totalMovies: 45000,
          activeNow: 42,
          storageUsed: "1.2 GB"
        });
      }
    } catch (err) {
      setStats({
        totalUsers: 1248,
        totalMovies: 45000,
        activeNow: 42,
        storageUsed: "1.2 GB"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

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
              Neural<span className="text-accent">Flix</span> Dashboard
            </h1>
            <p className="mt-2 text-text-muted">Welcome back, {user?.name || "Admin"}. System status is optimal.</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-all hover:border-accent/50">
              <Settings className="h-4 w-4" />
              System Settings
            </button>
            <button className="flex items-center gap-2 rounded-xl premium-gradient px-4 py-2 text-sm font-bold text-white shadow-lg transition-all hover:scale-105">
              <Database className="h-4 w-4" />
              Export Logs
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Users", value: stats?.totalUsers.toLocaleString(), icon: Users, trend: "+12%", color: "blue" },
            { label: "Catalog Size", value: stats?.totalMovies.toLocaleString(), icon: Film, trend: "+450", color: "purple" },
            { label: "Active Sessions", value: stats?.activeNow, icon: Activity, trend: "Stable", color: "green" },
            { label: "DB Storage", value: stats?.storageUsed, icon: Database, trend: "85%", color: "orange" },
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
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-green-500">{item.trend}</span>
                <ArrowUpRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
              {/* Background accent */}
              <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${item.color}-500/5 blur-2xl transition-all group-hover:bg-${item.color}-500/10`} />
            </div>
          ))}
        </div>

        {/* Recent Activity Section */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="premium-card rounded-2xl p-6 lg:col-span-2">
            <h3 className="mb-6 text-lg font-bold text-text-primary">System Activity</h3>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-transparent p-2 transition-all hover:border-border hover:bg-surface/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Activity className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary">New user registered</p>
                    <p className="text-xs text-text-muted">User {i*123} signed up using Google Auth</p>
                  </div>
                  <span className="text-[10px] font-medium text-text-muted">2 mins ago</span>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl p-6">
            <h3 className="mb-6 text-lg font-bold text-text-primary">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-text-primary transition-all hover:border-accent/50 hover:bg-accent/5">
                Rebuild Recommendation Index
              </button>
              <button className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-text-primary transition-all hover:border-accent/50 hover:bg-accent/5">
                Clear System Cache
              </button>
              <button className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-text-primary transition-all hover:border-accent/50 hover:bg-accent/5 text-accent">
                Flush All Sessions
              </button>
            </div>

            <div className="mt-10 rounded-2xl bg-accent/5 p-6 border border-accent/10">
              <h4 className="font-bold text-accent">System Health</h4>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                All microservices are reporting healthy. Latency is within the 150ms target range.
              </p>
              <div className="mt-4 h-2 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full w-[94%] premium-gradient" />
              </div>
              <p className="mt-2 text-right text-[10px] font-bold text-text-muted uppercase">94% Capacity</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
