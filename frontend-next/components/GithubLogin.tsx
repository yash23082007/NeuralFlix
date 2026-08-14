"use client";

import { useState } from "react";
import { Github } from "lucide-react";

export default function GithubLogin() {
  const [loading] = useState(false);

  const handleGithubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = window.location.origin + "/login";
    const scope = "user:email";
    
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = githubUrl;
  };

  return (
    <button
      onClick={handleGithubLogin}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary transition-all hover:bg-bg-elevated disabled:opacity-50 cursor-pointer"
    >
      <Github className="h-5 w-5" />
      <span>Continue with GitHub</span>
    </button>
  );
}
