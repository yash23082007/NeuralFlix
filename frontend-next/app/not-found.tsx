import Link from "next/link";
import { Film, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--surface-primary)] px-6">
      <Film className="h-14 w-14 text-[var(--text-tertiary)]" />
      <h2 className="text-4xl font-bold text-[var(--text-primary)]">404</h2>
      <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
        The page you&apos;re looking for doesn&apos;t exist. It may have been moved or removed.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-warm)] px-6 py-3 text-sm font-semibold text-black transition-all hover:brightness-110"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}
