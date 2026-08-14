/* eslint-disable */
// @ts-nocheck
import { Clock, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";



export type FreshnessStatus = "fresh" | "aging" | "stale" | "unknown";

interface FreshnessBadgeProps {
  status: FreshnessStatus;
  checkedAt?: string;
  source?: string;
  className?: string;
}

export default function FreshnessBadge({
  status,
  checkedAt,
  source = "tmdb",
  className = "",
}: FreshnessBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "fresh":
        return {
          color: "text-green-500",
          bg: "bg-green-500/10",
          border: "border-green-500/20",
          icon: CheckCircle2,
          label: "Verified recently",
        };
      case "aging":
        return {
          color: "text-yellow-500",
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/20",
          icon: Clock,
          label: "Data aging",
        };
      case "stale":
        return {
          color: "text-red-500",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
          icon: AlertTriangle,
          label: "Data might be stale",
        };
      default:
        return {
          color: "text-gray-500",
          bg: "bg-gray-500/10",
          border: "border-gray-500/20",
          icon: HelpCircle,
          label: "Unknown freshness",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  let tooltipText = config.label;
  if (checkedAt) {
    try {
      const date = new Date(checkedAt);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);
      
      let timeAgo = "";
      if (diffHrs < 1) timeAgo = "just now";
      else if (diffHrs < 24) timeAgo = `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
      else timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      tooltipText = `Checked ${timeAgo} via ${source.toUpperCase()}`;
    } catch (e) {
      // fallback
    }
  }

  return (
    <div
      className={`group relative flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${config.bg} ${config.border} ${config.color} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline-block capitalize">{status}</span>

      {/* Tooltip */}
      <div className="pointer-events-none absolute -top-8 left-1/2 flex -translate-x-1/2 items-center rounded bg-surface px-2 py-1 text-xs text-text-primary opacity-0 shadow border border-border transition-opacity group-hover:opacity-100 whitespace-nowrap z-50">
        {tooltipText}
      </div>
    </div>
  );
}
