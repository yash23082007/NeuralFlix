"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}>({ theme: "light", toggle: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    localStorage.setItem("nf-theme", "light");
  }, []);

  const setTheme = (t: Theme) => {};
  const toggle = () => {};

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme: "light", toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

