"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { AuthButton } from "@/components/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5 md:pt-4">
      <motion.div
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-paper via-paper/85 to-transparent"
      />
      <div
        className={`mx-auto flex max-w-[1320px] items-center justify-between rounded-full border px-3 py-2 backdrop-blur-xl transition-colors duration-300 md:px-4 ${
          scrolled ? "border-rule bg-card/80 shadow-[0_12px_32px_-26px_rgba(12,12,13,0.6)]" : "border-transparent bg-transparent shadow-none"
        }`}
      >
        <Link href="/" className="flex items-center gap-2 pl-1.5 pr-3">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthButton />
          <Link href="/canvas?demo=1" className="hidden rounded-full px-3.5 py-1.5 text-[13px] font-medium text-ash transition-colors hover:text-ink sm:block">
            See a demo room
          </Link>
          <Link href="/capture" className="btn btn-primary px-4 py-2 text-[13px]">
            Map your room
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Wordmark({ className = "text-[23px]" }: { className?: string }) {
  return (
    <span className={`relative select-none font-black italic leading-none tracking-[-0.055em] ${className}`}>
      Sightline
      <span className="absolute -right-2.5 top-0 text-[0.4em] font-semibold not-italic tracking-normal">®</span>
    </span>
  );
}
