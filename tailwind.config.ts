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
        display: ["var(--font-wordmark)", '"HK Venetian"', "Georgia", "serif"],
        wordmark: ["var(--font-wordmark)", '"HK Venetian"', "Georgia", "serif"],
        sans: ['"Inter Tight"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      // The hero draws in hard rectangles, so the whole scale collapses to a
      // hairline radius. `full` is left alone — it still has circles to make.
      borderRadius: {
        none: "0px",
        sm: "1px",
        DEFAULT: "2px",
        md: "2px",
        lg: "2px",
        xl: "3px",
        "2xl": "3px",
        "3xl": "4px",
        "4xl": "4px",
        "5xl": "6px",
        full: "9999px"
      },
      transitionTimingFunction: {
        // the slow settle the hero's links and buttons fade on
        editorial: "cubic-bezier(0.22, 0.61, 0.36, 1)"
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        drift: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(224,174,85,0.45)" },
          "100%": { boxShadow: "0 0 0 14px rgba(224,174,85,0)" }
        },
        tick: { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "1" } },
        rise: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } }
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        drift: "drift 4s ease-in-out infinite",
        ping2: "pulseRing 1.8s cubic-bezier(0,0,0.2,1) infinite",
        tick: "tick 2.2s ease-in-out infinite",
        rise: "rise 0.9s cubic-bezier(0.22,0.61,0.36,1) both",
        fade: "fade 1.1s cubic-bezier(0.22,0.61,0.36,1) both"
      }
    }
  },
  plugins: []
};
export default config;
