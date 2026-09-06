"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Homepage header, built to the Cabinet reference: one full-bleed photograph
 * with every piece of type laid over it — the story caption up top, and along
 * the bottom edge a blocked-out mono paragraph, the signature wordmark, and
 * the same paragraph mirrored on the right.
 *
 * The photograph lives at /public/hero/interior.jpg — swap that file to change
 * the image; nothing here needs to change with it.
 */

const BRAND_BLURB =
  "Sightline is a room editor of curated one-of-a-kind pieces that preserves stories of art and craft for contemporary interiors.";

export function Hero() {
  return (
    <section className="relative bg-ink">
      {/* ─────────────────────── the photograph ─────────────────────── */}
      <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden md:h-[88vh]">
        <Image
          src="/hero/interior.jpg"
          alt="A curated contemporary interior opening onto a garden"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        {/* Warmth + top and bottom falloff so the white type holds up over
            whatever part of the photograph sits behind it. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(12,10,8,0.55)_0%,rgba(12,10,8,0.12)_28%,rgba(12,10,8,0.10)_55%,rgba(12,10,8,0.72)_100%)]" />

        {/* ───────────────── story caption, top centre ───────────────── */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
          className="caption-serif absolute inset-x-0 top-[14%] text-center text-[clamp(15px,1.5vw,22px)] leading-[1.45] text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.45)]"
        >
          Each piece carries a story
          <br />
          of rarity and timeless design.
        </motion.p>

        {/* ───────────── bottom edge: blurb · wordmark · blurb ───────────── */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-6 md:px-10 md:pb-9">
          <div className="mx-auto grid max-w-[1500px] grid-cols-1 items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-10">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.35 }}
              className="mono justify-block hidden text-[clamp(8px,0.72vw,11px)] uppercase leading-[1.75] tracking-[0.06em] text-white/85 md:block"
            >
              {BRAND_BLURB}
            </motion.p>

            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="script select-none text-center text-[clamp(52px,6.5vw,92px)] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]"
            >
              Sightline
            </motion.span>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.35 }}
              className="mono justify-block hidden text-[clamp(8px,0.72vw,11px)] uppercase leading-[1.75] tracking-[0.06em] text-white/85 md:block"
            >
              {BRAND_BLURB}
            </motion.p>
          </div>
        </div>
      </div>

      {/* ──────────────────── identity rule beneath ──────────────────── */}
      <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 md:px-10">
        <span className="mono text-[11px] uppercase tracking-[0.22em] text-white/45">
          Identity
        </span>
        <span className="mono text-[11px] tracking-[0.1em] text-white/45">2025</span>
      </div>

      {/* ─────────────────────────── the ask ─────────────────────────── */}
      <div className="bg-paper px-5 py-14 text-center md:py-20">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="display-lg mx-auto text-[clamp(34px,6vw,68px)]"
        >
          Engineered for Living
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-ash"
        >
          Explore the first room editor you can furnish from. Photograph a space, place
          pieces measured to fit, buy them wherever they cost least.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
        >
          <Link href="/capture" className="btn btn-primary group px-6 py-3.5">
            Map your room free
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link href="/canvas?demo=1" className="btn btn-light px-6 py-3.5">
            See a finished room
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 text-[12px] text-ash"
        >
          No credit card. No measuring tape. Six photos is enough.
        </motion.div>
      </div>
    </section>
  );
}
