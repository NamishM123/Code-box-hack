import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // rgb(var(--x) / <alpha-value>) so utilities like bg-paper/40 keep
        // working while also responding to the light/dark theme toggle.
        paper: "rgb(var(--paper) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ash: "rgb(var(--ash) / <alpha-value>)",
        rule: "rgb(var(--rule) / <alpha-value>)",
        brass: "rgb(var(--brass) / <alpha-value>)",
        butter: "rgb(var(--butter) / <alpha-value>)",
        flame: "rgb(var(--flame) / <alpha-value>)",
        ocean: "rgb(var(--ocean) / <alpha-value>)",
        violet: "rgb(var(--violet) / <alpha-value>)",
        sage: "rgb(var(--sage) / <alpha-value>)",
        clay: "rgb(var(--clay) / <alpha-value>)"
      },
      fontFamily: {
        display: ['"Inter Tight"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Inter Tight"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      borderRadius: {
        "4xl": "28px",
        "5xl": "36px"
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        drift: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(242,180,65,0.55)" },
          "100%": { boxShadow: "0 0 0 14px rgba(242,180,65,0)" }
        },
        tick: { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "1" } }
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        drift: "drift 4s ease-in-out infinite",
        ping2: "pulseRing 1.8s cubic-bezier(0,0,0.2,1) infinite",
        tick: "tick 2.2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
export default config;
