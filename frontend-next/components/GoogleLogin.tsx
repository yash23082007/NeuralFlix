"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken, setUser } from "../lib/auth";
import { Cpu, ShieldAlert } from "lucide-react";

interface GoogleLoginProps {
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function GoogleLogin({ className }: GoogleLoginProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadGoogleScript = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
          callback: handleCredentialResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          { 
            theme: "filled_black", 
            size: "large", 
            width: "100%", 
            text: "continue_with",
            shape: "rectangular"
          }
        );
      }
    };

    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      loadGoogleScript();
    } else {
      initializeGoogle();
    }
  }, []);

  const handleCredentialResponse = async (response: any) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: response.credential }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Google login failed");
      }

      const data = await res.json();
      setToken(data.access_token);
      setUser(data.user);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full ${className} space-y-4`}>
      {/* Sleek Obsidian Frame for the button */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0c0c10]/40 p-2 shadow-inner">
        <div className="absolute inset-0 pointer-events-none opacity-[0.01] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
        <div id="google-signin-button" className="w-full overflow-hidden rounded-xl"></div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/10 bg-red-950/10 px-4 py-2.5 text-xs text-red-400 font-mono uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
          <span>[AUTH ERR: {error}]</span>
        </div>
      )}
      
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest text-[#00dce5] uppercase animate-pulse">
          <Cpu className="h-3.5 w-3.5 animate-spin" />
          <span>VERIFYING GOOGLE KEYSHARES...</span>
        </div>
      )}
    </div>
  );
}
