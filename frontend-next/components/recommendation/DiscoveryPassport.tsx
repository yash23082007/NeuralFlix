"use client";

import { useEffect, useState } from "react";
import { Globe, MapPin, Clapperboard, Sparkles, Download, Trash2, Shield, RefreshCw } from "lucide-react";
import { authFetch } from "../../lib/auth";

interface PassportStats {
  languagesExplored: number;
  countriesExplored: number;
  newDirectors: number;
  hiddenGemsSaved: number;
  comfortZoneRatio: number;
  discoveryRatio: number;
  languages: string[];
  totalFilms: number;
}

interface PassportData {
  trackingEnabled: boolean;
  message?: string;
  stats?: PassportStats | null;
}

export default function DiscoveryPassport() {
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPassport();
  }, []);

  const fetchPassport = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/discovery-passport`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load passport");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOptIn = async () => {
    setActionLoading(true);
    try {
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/discovery-passport/opt-in`, { method: "PUT" });
      await fetchPassport();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOptOut = async () => {
    if (!confirm("Are you sure you want to disable tracking? Your stats will pause.")) return;
    setActionLoading(true);
    try {
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/discovery-passport/opt-out`, { method: "PUT" });
      await fetchPassport();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("WARNING: This will permanently delete your discovery history and disable tracking. Proceed?")) return;
    setActionLoading(true);
    try {
      await authFetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/discovery-passport`, { method: "DELETE" });
      await fetchPassport();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/users/me/discovery-passport/export`;
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-surface/50 border border-border">
        <RefreshCw className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 border border-red-500/20 rounded-xl bg-red-500/10 text-sm">{error}</div>;
  }

  if (!data?.trackingEnabled) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Globe className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black text-text-primary mb-3">Discovery Passport</h2>
        <p className="text-sm text-text-muted max-w-md mx-auto mb-8 leading-relaxed">
          Track the countries, languages, and hidden gems you explore on NeuralFlix. 
          We believe in strict privacy — tracking is <strong>opt-in only</strong>, never shared, and never gamified.
        </p>
        <button
          onClick={handleOptIn}
          disabled={actionLoading}
          className="rounded-xl premium-gradient px-8 py-3 font-bold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
        >
          {actionLoading ? "Enabling..." : "Enable Discovery Tracking"}
        </button>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
      <div className="bg-background border-b border-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-text-primary">Discovery Passport</h2>
            <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
              <Shield className="h-3 w-3 text-green-500" /> Private to you
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>
          <button
            onClick={handleOptOut}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent cursor-pointer"
          >
            Pause Tracking
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {[
            { label: "Languages", value: stats?.languagesExplored || 0, icon: Globe, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Countries", value: stats?.countriesExplored || 0, icon: MapPin, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Directors", value: stats?.newDirectors || 0, icon: Clapperboard, color: "text-purple-500", bg: "bg-purple-500/10" },
            { label: "Hidden Gems", value: stats?.hiddenGemsSaved || 0, icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4 flex flex-col justify-center items-center text-center">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${s.bg} ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-black text-text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border bg-background p-6">
          <h4 className="text-sm font-bold text-text-primary mb-4">Comfort vs Discovery Ratio</h4>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-border">
            <div 
              className="bg-accent/50 transition-all duration-1000"
              style={{ width: `${stats?.comfortZoneRatio || 0}%` }}
              title={`Comfort Zone: ${stats?.comfortZoneRatio}%`}
            />
            <div 
              className="bg-accent transition-all duration-1000"
              style={{ width: `${stats?.discoveryRatio || 0}%` }}
              title={`Discovery: ${stats?.discoveryRatio}%`}
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-text-muted">Comfort Zone ({stats?.comfortZoneRatio || 0}%)</span>
            <span className="text-accent">Discovery ({stats?.discoveryRatio || 0}%)</span>
          </div>
          <p className="mt-4 text-xs text-text-muted leading-relaxed">
            * This is an honest reflection of your viewing habits, not a score to maximize. 
            &quot;Comfort zone&quot; refers to popular, same-language films, while &quot;Discovery&quot; refers to international or hidden gem selections.
          </p>
        </div>
      </div>
    </div>
  );
}
