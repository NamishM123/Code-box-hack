"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthButton } from "@/components/AuthButton";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Pinterest", href: "/pinterest" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Your Rooms", href: "/rooms" }
];

/**
 * The header every page but the landing page wears — the hero's own nav row,
 * translated onto paper. Same face, same tracking, same slow fade on hover; a
 * hairline rule appears under it once the page has moved, and nothing rounds.
 *
 * The landing page draws its own in white, straight over the footage.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500 ${
        scrolled ? "border-rule bg-paper/90 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4">
        <Link href="/" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-x-8 lg:flex xl:gap-x-10">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="nav-link text-ink">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <AuthButton />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="nav-link border border-rule px-3 py-2 text-ink transition-colors hover:border-ink lg:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-rule bg-paper/95 backdrop-blur-xl lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="nav-link block border-b border-rule/60 px-5 py-4 text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** SIGHTLINE, in the hero's face and at the hero's tracking. */
export function Wordmark({ className = "text-[19px]" }: { className?: string }) {
  return (
    <span className={`wordmark select-none uppercase tracking-[0.2em] ${className}`}>
      Sightline
    </span>
  );
}
