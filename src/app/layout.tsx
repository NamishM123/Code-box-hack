import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sightline — See the room before you buy",
  description:
    "A camera-first room editor. Guided photos become an editable room. Furniture picks are placed with fit rationale, not guesswork.",
  openGraph: { title: "Sightline", description: "See the room before you buy." }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen antialiased">{children}</body>
    </html>
  );
}
