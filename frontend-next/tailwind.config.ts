import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Cabinet Grotesk", "sans-serif"],
      },
      colors: {
        primary: "var(--primary)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
      },
    },
  },
  plugins: [],
};

export default config;
