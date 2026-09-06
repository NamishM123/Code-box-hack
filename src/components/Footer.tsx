import Link from "next/link";

import { Wordmark } from "@/components/Nav";

/**
 * The close of the page: the wordmark at size, one sentence about what this
 * is, the action, and the legal row under a rule.
 *
 * The wordmark is set in `.chrome`, the slow metallic sweep that has been
 * sitting in globals.css since it was written for exactly this and never
 * actually used anywhere. It gives the page an ending instead of a strip of
 * small print. It stops moving entirely under prefers-reduced-motion.
 *
 * Same links, same action, same copy. Composition only.
 */
export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-rule bg-panel">
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,110,40,0.14),transparent_68%)] blur-2xl" />

      <div className="relative mx-auto max-w-[1600px] px-5 py-16 md:py-24">
        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between md:gap-16">
          <div className="max-w-lg">
            <Wordmark className="chrome text-[42px] md:text-[64px] lg:text-[76px]" />
            <p className="caption mt-6 max-w-sm">
              A camera-first room editor for people who would rather make one
              confident decision than scroll a thousand listings.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/capture" className="btn btn-primary px-7 py-3.5">
              Map your room
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-8">
          <p className="eyebrow">
            © {new Date().getFullYear()} Sightline · Not affiliated with any retailer
          </p>
          <nav aria-label="Legal" className="flex gap-7">
            <Link
              href="/privacy"
              className="eyebrow link-underline rounded-sm transition-colors duration-500 hover:text-ink"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="eyebrow link-underline rounded-sm transition-colors duration-500 hover:text-ink"
            >
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
