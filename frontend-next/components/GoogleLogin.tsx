"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken, setUser } from "../lib/auth";

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
          { theme: "outline", size: "large", width: "100%", text: "continue_with" }
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
    <div className={`w-full ${className}`}>
      <div id="google-signin-button" className="w-full"></div>
      {error && (
        <p className="mt-2 text-center text-xs text-accent">{error}</p>
      )}
      {loading && (
        <p className="mt-2 text-center text-xs text-text-muted animate-pulse">Processing Google login...</p>
      )}
    </div>
  );
}
