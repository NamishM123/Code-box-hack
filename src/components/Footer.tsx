import Link from "next/link";

import { Wordmark } from "@/components/Nav";

/**
 * The close of the page, in the hero's register: the wordmark, one line of
 * tracked caps, the two actions as hairline rectangles, and a rule.
 */
export function Footer() {
  return (
    <footer className="border-t border-rule bg-paper">
      <div className="mx-auto max-w-[1600px] px-5 py-14 md:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <Wordmark className="text-[26px] md:text-[32px]" />
            <p className="caption mt-5 max-w-sm">
              A camera-first room editor for people who would rather make one
              confident decision than scroll a thousand listings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/capture" className="btn btn-primary px-7 py-3">Map your room</Link>
          </div>
        </div>

        <div className="eyebrow mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-7">
          <span>© {new Date().getFullYear()} Sightline · Not affiliated with any retailer</span>
          <div className="flex gap-7">
            <Link href="/privacy" className="link-underline transition-colors duration-500 hover:text-ink">Privacy</Link>
            <Link href="/terms" className="link-underline transition-colors duration-500 hover:text-ink">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
