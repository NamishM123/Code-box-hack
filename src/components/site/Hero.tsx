"use client";
import Link from "next/link";
import { MarketplaceCarousel } from "./MarketplaceCarousel";

/**
 * The landing page, and the whole of it: the interior footage full-bleed,
 * borderless page links across the top, the wordmark and its one action
 * centred, and the marketplace carousel along the bottom edge.
 *
 * The clip at /public/hero/hero.mp4 already has its title card trimmed off and
 * its corner logo painted out, so nothing here needs to mask it.
 */

const PAGES = [
  { label: "Product", href: "/product" },
  { label: "Shops", href: "/shops" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Rooms", href: "/rooms" },
  { label: "Pricing", href: "/pricing" }
];

export function Hero() {
  return (
    <section className="relative flex h-[100svh] min-h-[560px] w-full flex-col overflow-hidden bg-ink">
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

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,9,8,0.5)_0%,rgba(10,9,8,0.06)_24%,rgba(10,9,8,0.22)_62%,rgba(10,9,8,0.8)_100%)]" />

      {/* ───────────────────── page links, top ───────────────────── */}
      <header className="relative z-20 px-5 pt-7 md:pt-9">
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 md:gap-x-10">
          {PAGES.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="wordmark text-[13px] uppercase tracking-[0.2em] text-white transition-opacity duration-300 hover:opacity-70"
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ──────────── wordmark, caption and action — left, centred ──────────── */}
      <div className="relative z-20 flex flex-1 items-center px-6 md:px-14 lg:px-20">
        <div className="max-w-2xl">
          <h1 className="wordmark select-none text-[clamp(46px,9vw,132px)] uppercase leading-[0.95] tracking-[0.03em] text-white">
            Sightline
          </h1>

          <p className="wordmark mt-5 max-w-md text-[14px] uppercase leading-[1.8] tracking-[0.14em] text-white md:mt-6 md:text-[15px]">
            Photograph a room. Place furniture measured to fit it. Buy each piece
            from whichever marketplace lists it lowest.
          </p>

          <Link
            href="/capture"
            className="mt-8 inline-block border border-white px-8 py-3 text-[11px] uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-white hover:text-ink md:mt-9"
          >
            Map your room
          </Link>
        </div>
      </div>

      {/* ─────────────────── marketplaces, bottom ─────────────────── */}
      <div className="relative z-20 pb-7 md:pb-9">
        <MarketplaceCarousel />
      </div>
    </section>
  );
}
