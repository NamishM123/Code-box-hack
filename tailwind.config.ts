import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0f",
        cream: "#f6f1ea",
        sand: "#e9e0d2",
        clay: "#c98b6b",
        moss: "#5a6b4a",
        accent: "#ff5f3d"
      },
      fontFamily: {
        display: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"]
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        }
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        float: "float 4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
export default config;
