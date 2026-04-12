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
        display: ["var(--font-playfair)", "serif"],
        heading: ["var(--font-dm-sans)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // Dynamic CSS variable colors (theme-aware)
        background: "var(--bg-primary)",
        surface: "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        border: "var(--border)",
        accent: "var(--accent)",
        glass: "var(--glass-bg)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",

        // Cinema Region Accents
        "accent-india": "var(--accent-india)",
        "accent-korea": "var(--accent-korea)",
        "accent-japan": "var(--accent-japan)",
        "accent-france": "var(--accent-france)",
        "accent-hollywood": "var(--accent-hollywood)",
        "accent-iran": "var(--accent-iran)",
        "accent-latin": "var(--accent-latin)",
        "accent-africa": "var(--accent-africa)",

        // Brand Colors
        "imdb-gold": "#F5C518",
        "imdb-gold-dark": "#D4A100",
        "rt-red": "#FA320A",
        "mc-green": "#6C3",
        "neural-crimson": "#E50914",
        "neural-electric": "#00D4FF",
        "neural-purple": "#7B2FFF",
        "neural-gold": "#F5C518",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)",
        gold: "var(--shadow-gold)",
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
