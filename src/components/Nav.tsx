"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthButton } from "@/components/AuthButton";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Pinterest", href: "/pinterest" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Your Rooms", href: "/rooms" }
];

/**
 * The header every page but the landing page wears: the hero's own nav row,
 * translated onto paper. Same face, same tracking, same slow fade on hover.
 *
 * Three things it did not do before. It never said which page you were on, so
 * every link looked identical everywhere in the site. Its mobile menu had no
 * way out but the toggle, and stayed open across navigations. And once
 * scrolled it sat on a flat fill with a hairline that was not quite visible.
 *
 * The landing page draws its own in white, straight over the footage.
 */
export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A menu that survives the navigation it just triggered is a menu covering
  // the page you asked for.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500 ${
        scrolled ? "border-rule bg-paper/85 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 py-4">
        <Link href="/" className="shrink-0 rounded-sm" aria-label="Sightline, home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-x-8 lg:flex xl:gap-x-10">
          {LINKS.map((l) => {
            const current = isCurrent(l.href);
            return (
              <Link
                key={l.label}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={`nav-link relative rounded-sm py-1 transition-colors ${
                  current ? "text-ink" : "text-ash hover:text-ink"
                }`}
              >
                {l.label}
                {/* The page you are on gets the rule under it. */}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 left-0 h-px bg-brass transition-all duration-500 ease-editorial ${
                    current ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <AuthButton />
          <Link href="/capture" className="btn btn-primary hidden px-5 py-2.5 sm:inline-flex">
            Map your room
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="nav-link rounded-[var(--r-control)] border border-rule px-3 py-2 text-ink transition-colors hover:border-ink lg:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-rule bg-paper/95 backdrop-blur-xl lg:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              aria-current={isCurrent(l.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={`nav-link block border-b border-rule/60 px-5 py-4 ${
                isCurrent(l.href) ? "text-brass" : "text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/capture"
            onClick={() => setOpen(false)}
            className="nav-link block px-5 py-4 text-ink"
          >
            Map your room
          </Link>
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
