import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // rgb(var(--x) / <alpha-value>) so utilities like bg-paper/40 keep
        // working while responding to the tokens in globals.css.
        paper: "rgb(var(--paper) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        ash: "rgb(var(--ash) / <alpha-value>)",
        rule: "rgb(var(--rule) / <alpha-value>)",
        "rule-strong": "rgb(var(--rule-strong) / <alpha-value>)",
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
      // A real scale again. The whole thing used to collapse to 1-2px, which
      // meant the 107 rounded-* calls already in the codebase rendered as
      // square and every screen read like a wireframe. Surfaces are soft,
      // controls are a touch tighter, tokens stay pills.
      borderRadius: {
        none: "0px",
        sm: "5px",
        DEFAULT: "7px",
        md: "9px",
        lg: "12px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "22px",
        "4xl": "28px",
        "5xl": "34px",
        full: "9999px"
      },
      boxShadow: {
        // Tinted to the page's warm black. No pure-black drops.
        sm: "0 1px 2px rgba(8, 6, 5, 0.4)",
        DEFAULT: "0 2px 4px rgba(8, 6, 5, 0.36), 0 8px 20px -6px rgba(8, 6, 5, 0.5)",
        md: "0 2px 4px rgba(8, 6, 5, 0.36), 0 8px 20px -6px rgba(8, 6, 5, 0.5)",
        lg: "0 4px 8px rgba(8, 6, 5, 0.34), 0 18px 44px -12px rgba(8, 6, 5, 0.6)",
        xl: "0 8px 16px rgba(8, 6, 5, 0.32), 0 32px 72px -16px rgba(8, 6, 5, 0.66)",
        edge: "inset 0 1px 0 rgba(255, 255, 255, 0.06)"
      },
      transitionTimingFunction: {
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
