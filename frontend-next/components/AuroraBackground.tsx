"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function AuroraBackground() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      <div 
        className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob ${
          currentTheme === "dark" ? "bg-neural-purple" : "bg-purple-300"
        }`}
      />
      <div 
        className={`absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-blob animation-delay-2000 ${
          currentTheme === "dark" ? "bg-neural-crimson" : "bg-rose-300"
        }`}
      />
      <div 
        className={`absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[130px] opacity-20 animate-blob animation-delay-4000 ${
          currentTheme === "dark" ? "bg-neural-electric" : "bg-blue-300"
        }`}
      />
      
      {/* Texture overlay for that premium 'tactile' feel */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
    </div>
  );
}
