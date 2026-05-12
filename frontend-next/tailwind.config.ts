import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Clash Display'", "sans-serif"],
        heading: ["'Clash Display'", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      colors: {
        background: "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-glass": "var(--bg-glass)",
        "bg-glass-border": "var(--bg-glass-border)",
        
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",

        "accent-primary": "var(--accent-primary)",
        "accent-secondary": "var(--accent-secondary)",
        "accent-warm": "var(--accent-warm)",
        "accent-success": "var(--accent-success)",
      },
      backgroundImage: {
        'gradient-hero': "var(--gradient-hero)",
        'gradient-card': "var(--gradient-card)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        card: "var(--shadow-card)",
        hover: "var(--shadow-hover)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
        smooth: "var(--ease-smooth)",
      },
    },
  },
  plugins: [],
};

export default config;
