import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101113",
        paper: "#F3F0E8",
        brass: "#C89F5A",
        ash: "#B8B4AA",
        rule: "#4B4A45",
        surface: "#17181B",
        overlay: "#1E1F23"
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "ui-serif", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        drift: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseRing: { "0%": { boxShadow: "0 0 0 0 rgba(200,159,90,0.5)" }, "100%": { boxShadow: "0 0 0 14px rgba(200,159,90,0)" } }
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        drift: "drift 4s ease-in-out infinite",
        ping2: "pulseRing 1.8s cubic-bezier(0,0,0.2,1) infinite"
      }
    }
  },
  plugins: []
};
export default config;
