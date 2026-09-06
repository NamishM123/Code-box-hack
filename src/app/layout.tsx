import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Cormorant_Garamond, Parisienne } from "next/font/google";
import "./globals.css";

/**
 * Self-hosted through next/font rather than a stylesheet @import, so the
 * signature wordmark and the italic caption in the hero can't fall back to a
 * plain serif on a slow or blocked font request.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap"
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["300", "400", "500"],
  variable: "--font-serif",
  display: "swap"
});

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Sightline · Engineered for Living",
  description:
    "The first room editor you can furnish from. Photograph your space, place real furniture measured to fit, then buy it from Amazon, Target, Walmart, or Facebook Marketplace at the best price.",
  openGraph: {
    title: "Sightline · Engineered for Living",
    description: "Photograph a room. Place furniture that measurably fits. Buy it from whichever shop is cheapest."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetBrainsMono.variable} ${cormorant.variable} ${parisienne.variable}`}
    >
      <body className="grain min-h-screen antialiased">{children}</body>
    </html>
  );
}
