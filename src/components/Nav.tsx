"use client";
import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md" style={{ background: "rgba(16,17,19,0.6)", borderBottom: "1px solid rgba(184,180,170,0.08)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-7 w-7 place-items-center rounded-sm border border-brass/70">
            <span className="font-display text-xs text-brass">S</span>
          </div>
          <span className="font-display text-2xl leading-none">Sightline</span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-ash sm:inline">Vol. 01 · MMXXVI</span>
        </Link>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.2em] text-ash md:flex">
          <Link href="/#how" className="hover:text-paper">Method</Link>
          <Link href="/#principles" className="hover:text-paper">Principles</Link>
          <Link href="/capture" className="hover:text-paper">Capture</Link>
        </nav>
        <Link href="/capture" className="btn btn-primary text-xs uppercase tracking-[0.2em]">Map a room</Link>
      </div>
    </header>
  );
}
