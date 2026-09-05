"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-cream">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-2xl leading-none">Roomly</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-black/70 md:flex">
          <Link href="/#how" className="hover:text-black">How it works</Link>
          <Link href="/#sources" className="hover:text-black">Sources</Link>
          <Link href="/design" className="hover:text-black">Design a room</Link>
        </nav>
        <Link href="/design" className="btn btn-primary">Start free</Link>
      </div>
    </header>
  );
}
