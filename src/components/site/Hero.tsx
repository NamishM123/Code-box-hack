"use client";
import Link from "next/link";

/**
 * Homepage header: the interior footage running full-bleed, minimal page
 * buttons along the top, and the wordmark set in Latin Modern Roman down in
 * the bottom-left corner.
 *
 * The clip lives at /public/hero/hero.mp4 — already trimmed past its title
 * card and cropped clear of the corner logo, so it needs no masking here.
 */

const PAGES = [
  { label: "Product", href: "/product" },
  { label: "Pieces", href: "/#pieces" },
  { label: "Shops", href: "/shops" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Rooms", href: "/rooms" }
];

export function Hero() {
  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink">
      {/* ─────────────────────────── footage ─────────────────────────── */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        poster="/hero/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        {/* WebM first for builds shipped without the H.264 decoder; the MP4
            carries everything else, Safari included. */}
        <source src="/hero/hero.webm" type="video/webm" />
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>

      {/* Falloff top and bottom so the buttons and the wordmark keep their
          contrast wherever the footage happens to be bright. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,9,8,0.55)_0%,rgba(10,9,8,0.05)_26%,rgba(10,9,8,0.10)_58%,rgba(10,9,8,0.78)_100%)]" />

      {/* ──────────────────── page buttons, top ──────────────────── */}
      <header className="absolute inset-x-0 top-0 z-20 px-5 pt-6 md:pt-8">
        <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          {PAGES.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="rounded-full border border-white/30 px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:border-white/80"
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ──────────────── wordmark, bottom left ──────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-7 md:px-9 md:pb-9">
        <h1 className="wordmark select-none text-[clamp(20px,2.2vw,32px)] uppercase tracking-[0.06em] text-white">
          Sightline
        </h1>
      </div>
    </section>
  );
}
