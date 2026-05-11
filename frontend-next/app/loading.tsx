import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-neural-purple flex items-center justify-center animate-pulse">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-accent/20 to-neural-purple/20 blur-xl animate-pulse" />
        </div>
        <div className="space-y-2 text-center">
          <div className="h-4 w-48 rounded-full bg-bg-elevated skeleton mx-auto" />
          <div className="h-3 w-32 rounded-full bg-bg-elevated skeleton mx-auto" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 rounded-full bg-neural-purple animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 rounded-full bg-neural-electric animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </main>
  );
}
