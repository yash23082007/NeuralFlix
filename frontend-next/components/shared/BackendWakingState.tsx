"use client";

import { Loader2, ServerCrash, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function BackendWakingState() {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // If it takes more than 15 seconds, show error state
    const timer = setTimeout(() => setShowError(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {showError ? (
        <>
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <ServerCrash className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Backend Connection Failed</h3>
          <p className="text-muted-foreground max-w-md mb-6 text-sm">
            The free Render instance may be asleep or unreachable. Please try again.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-medium hover:brightness-110 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        </>
      ) : (
        <>
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h3 className="text-xl font-bold mb-2">Waking up the backend...</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            NeuralFlix runs on a free Render instance which spins down after inactivity. 
            This first request might take 30-50 seconds.
          </p>
        </>
      )}
    </div>
  );
}
