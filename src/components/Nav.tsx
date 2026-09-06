"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { AuthButton } from "@/components/AuthButton";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Pieces", href: "/#pieces" },
  { label: "Shops", href: "/shops" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Rooms", href: "/rooms" }
];

/**
 * `overDark` marks pages whose header sits on a dark full-bleed image — the bar
 * then renders in white until the first scroll lifts the paper backdrop in.
 *
 * `revealOnScroll` keeps the bar out of the way entirely until the reader has
 * left the header behind, for pages whose hero carries its own page buttons.
 */
export function Nav({
  overDark = false,
  revealOnScroll = false
}: {
  overDark?: boolean;
  revealOnScroll?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [past, setPast] = useState(false);
  const [open, setOpen] = useState(false);

  const light = overDark && !scrolled;
  const hidden = revealOnScroll && !past;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      setPast(window.scrollY > window.innerHeight * 0.75);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-opacity duration-500 md:px-5 md:pt-4 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={hidden}
    >
      <motion.div
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-paper via-paper/85 to-transparent"
      />
      <motion.div
        animate={{
          backgroundColor: scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0)",
          borderColor: scrolled ? "rgba(12,12,13,0.10)" : "rgba(12,12,13,0)",
          boxShadow: scrolled ? "0 12px 32px -26px rgba(12,12,13,0.6)" : "0 0px 0px rgba(12,12,13,0)"
        }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        className="mx-auto flex max-w-[1320px] items-center justify-between rounded-none border px-3 py-2 backdrop-blur-xl md:px-4"
      >
        <Link
          href="/"
          className={`flex items-center gap-2 pl-1.5 pr-3 transition-colors ${light ? "text-white" : "text-ink"}`}
        >
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`wordmark rounded-none px-3.5 py-1.5 text-[12px] uppercase tracking-[0.16em] transition-colors ${
                light ? "text-white/75 hover:text-white" : "text-ash hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButton light={light} />
          <Link
            href="/canvas?demo=1"
            className={`wordmark hidden rounded-none px-3.5 py-1.5 text-[12px] uppercase tracking-[0.16em] transition-colors sm:block ${
              light ? "text-white/75 hover:text-white" : "text-ash hover:text-ink"
            }`}
          >
            See a demo room
          </Link>
          <Link
            href="/capture"
            className={`btn px-4 py-2 text-[13px] ${light ? "bg-white text-ink hover:bg-white/90" : "btn-primary"}`}
          >
            Map your room
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className={`grid h-9 w-9 place-items-center rounded-none border transition-colors lg:hidden ${
              light ? "border-white/30 bg-white/10 text-white" : "border-rule bg-white/60 text-ink"
            }`}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto mt-2 max-w-[1320px] overflow-hidden border border-rule bg-white/95 p-2 backdrop-blur-xl lg:hidden"
          >
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="wordmark block px-4 py-3 text-[14px] uppercase tracking-[0.16em] text-ink hover:bg-ink/[0.04]"
              >
                {l.label}
              </Link>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Wordmark({ className = "text-[19px]" }: { className?: string }) {
  return (
    <span className={`wordmark relative select-none uppercase leading-none tracking-[0.06em] ${className}`}>
      Sightline
      <span className="absolute -right-2.5 top-0 text-[0.4em] tracking-normal">®</span>
    </span>
  );
}
