import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F0EFEC",
        card: "#FFFFFF",
        ink: "#0C0C0D",
        panel: "#141416",
        overlay: "#1D1D20",
        surface: "#E7E5E0",
        ash: "#6E6C67",
        rule: "#DCDAD4",
        brass: "#B4530F",
        butter: "#F2B441",
        flame: "#FF5A1F",
        ocean: "#2F5CFF",
        violet: "#7C4DFF",
        sage: "#4C7A5A",
        clay: "#C9603F"
      },
      fontFamily: {
        display: ["var(--font-sans)", '"Inter Tight"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", '"Inter Tight"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", '"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        script: ["var(--font-script)", '"Snell Roundhand"', "cursive"],
        serif: ["var(--font-serif)", "Georgia", "serif"]
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
