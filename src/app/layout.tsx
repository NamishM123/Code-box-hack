import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="grain min-h-screen antialiased">{children}</body>
    </html>
  );
}
