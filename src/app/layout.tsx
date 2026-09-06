import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { InkGardenBackdrop } from "@/components/site/InkGarden";

/**
 * HK Venetian — the face the hero wordmark, the page links and every button on
 * the site are set in. Self-hosted through next/font rather than a stylesheet
 * request so it can't fall back to a plain serif mid-fade. Inter Tight and
 * JetBrains Mono still arrive via the @import in globals.css.
 */
const hkVenetian = localFont({
  src: "./fonts/hk-venetian-regular.ttf",
  weight: "400",
  style: "normal",
  variable: "--font-wordmark",
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
    <html lang="en" className={hkVenetian.variable}>
      <body className="grain min-h-screen antialiased">
        {/* public/ink-rose.png is a screenshot of a dither rather than the
            photograph behind it, so it is blurred by about a dot pitch before
            being sampled — laying our own grid straight over the one baked into
            those pixels moires. Swap in the original photo and drop sourceBlur
            to 0; a missing file falls back to the painted garden. */}
        <InkGardenBackdrop sourceUrl="/ink-rose.png" sourceBlur={9} />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
