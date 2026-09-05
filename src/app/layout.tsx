import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roomly — Find furniture, design your room",
  description:
    "Search Amazon, Facebook Marketplace, Target and more within your budget, then see your room come to life in 2D and 3D.",
  openGraph: { title: "Roomly", description: "Furniture finder + AI room designer" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grain min-h-screen antialiased">{children}</body>
    </html>
  );
}
