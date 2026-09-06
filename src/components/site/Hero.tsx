"use client";
import Link from "next/link";

import { AuthButton } from "@/components/AuthButton";
import { MarketplaceCarousel } from "./MarketplaceCarousel";

/**
 * The landing page, and the whole of it: the interior footage full-bleed,
 * borderless page links across the top, the wordmark and its one action
 * centred on the left, and the marketplace carousel along the bottom edge.
 *
 * The clip at /public/hero/hero.mp4 already has its title card trimmed off and
 * its corner logo painted out, so nothing here needs to mask it.
 */

const PAGES = [
  { label: "Product", href: "/product" },
  { label: "Pinterest", href: "/pinterest" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Your Rooms", href: "/rooms" },
  { label: "Pricing", href: "/pricing" }
];

export function Hero() {
  return (
    <section className="relative flex h-[100svh] min-h-[560px] w-full flex-col overflow-hidden bg-[#0A0908]">
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
        <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-6">
          {/* Sign in sits opposite the toggle so the link row stays optically
              centred on the page, not on whatever is left over beside it. */}
          <div className="hidden w-32 shrink-0 pt-0.5 lg:block">
            <AuthButton light />
          </div>

          <nav className="fade-in flex flex-1 flex-wrap items-center justify-center gap-x-7 gap-y-2 md:gap-x-10">
            {PAGES.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="wordmark text-[13px] uppercase tracking-[0.2em] text-white transition-opacity duration-500 hover:opacity-60"
              >
                {p.label}
              </Link>
            ))}
          </nav>

          <div className="hidden w-32 shrink-0 lg:block" />
        </div>

        {/* Below lg, sign-in drops under the links rather than squeezing
            onto three lines. */}
        <div className="mt-5 flex items-center justify-center lg:hidden">
          <AuthButton light />
        </div>
      </header>

      {/* ──────────── wordmark, caption and action — left, centred ──────────── */}
      <div className="relative z-20 flex flex-1 items-center px-6 md:px-14 lg:px-20">
        <div className="max-w-2xl">
          <h1
            className="rise wordmark select-none text-[clamp(46px,9vw,132px)] uppercase leading-[0.95] tracking-[0.03em] text-white"
            style={{ ["--delay" as string]: "0.05s" }}
          >
            Sightline
          </h1>

          <p
            className="rise wordmark mt-5 max-w-md text-[14px] uppercase leading-[1.8] tracking-[0.14em] text-white md:mt-6 md:text-[15px]"
            style={{ ["--delay" as string]: "0.2s" }}
          >
            Photograph a room. Place furniture measured to fit it. Buy each piece
            from whichever marketplace lists it lowest.
          </p>

          <div
            className="rise mt-8 flex flex-wrap items-center gap-3 md:mt-9"
            style={{ ["--delay" as string]: "0.35s" }}
          >
            <Link href="/capture" className="btn btn-glass px-8 py-3">
              Map your room
            </Link>
            <Link href="/canvas?demo=1" className="btn btn-glass px-8 py-3">
              See a demo room
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────── marketplaces, bottom ─────────────────── */}
      <div className="relative z-20 pb-7 md:pb-9">
        <MarketplaceCarousel />
      </div>
    </section>
  );
}
