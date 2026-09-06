"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "sightline:theme";

/** `light` styles the control for a dark backdrop — the hero footage. */
export function ThemeToggle({ className = "", light = false }: { className?: string; light?: boolean }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(dark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  // Avoid a flash of the wrong icon before we know the real theme.
  if (!mounted) return <div className={`h-9 w-9 ${className}`} />;

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`grid h-9 w-9 place-items-center border transition-colors duration-500 ${
        light
          ? "border-white/40 text-white hover:bg-white hover:text-ink"
          : "border-rule text-ink hover:border-ink hover:bg-ink hover:text-paper"
      } ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
