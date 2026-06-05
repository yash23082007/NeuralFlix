"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="relative w-9 h-9 rounded-full flex items-center justify-center
                 border border-[var(--border-default)] hover:border-[var(--border-accent)]
                 bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)]
                 transition-all duration-200 group"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span
            key="moon"
            initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1 }}
            exit={{   opacity: 0, rotate: 30,   scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-4 w-4 text-[var(--accent-warm)]" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ opacity: 0, rotate: 30,  scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0,   scale: 1 }}
            exit={{   opacity: 0, rotate: -30,  scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-4 w-4 text-[var(--accent-warm)]" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
