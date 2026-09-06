"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const PRODUCTS = [
  {
    src: "/demo-products/linen-sofa.png",
    label: "Linen Sofa",
    spec: '84" W × 36" D × 32" H\nFrom the Essentials Collection\nEdition No. 04/50\nDesigned by Sightline Studio',
    num: "01",
  },
  {
    src: "/demo-products/camel-chair.png",
    label: "Camel Lounge Chair",
    spec: '30" W × 32" D × 33" H\nSaddle leather, walnut frame\nFrom the Essentials Collection\nEdition No. 11/30',
    num: "02",
  },
  {
    src: "/demo-products/brass-lamp.png",
    label: "Brass Floor Lamp",
    spec: '62" H, 12" shade diameter\nSolid brass, linen shade\nFrom the Essentials Collection\nDesigned by Sightline Studio',
    num: "03",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ───────────────────── top bar ───────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <span className="mono text-[11px] font-medium uppercase tracking-[0.2em]">
          Room Editor
        </span>
        <span className="mono text-[11px] font-medium uppercase tracking-[0.2em]">
          Sightline
        </span>
      </div>

      {/* ───────────────── main editorial grid ───────────── */}
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-4 md:px-10 md:pb-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* left: headline */}
          <div className="flex flex-col justify-between gap-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className="mono text-[clamp(28px,4.2vw,52px)] font-medium uppercase leading-[1.15] tracking-tight"
            >
              // Sightline.
              <br />
              Introducing:
              <br />
              Rare and unique
              <br />
              pieces curated
              <br />
              for modern living.
            </motion.h1>

            {/* product specs row */}
            <div className="hidden grid-cols-3 gap-4 lg:grid">
              {PRODUCTS.map((p) => (
                <div key={p.num} className="mono text-[10px] leading-relaxed text-ash">
                  <p className="mb-1 text-[11px] font-medium text-ink">{p.label}</p>
                  {p.spec.split("\n").map((line, i) => (
                    <span key={i} className="block">{line}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* right: editorial image cluster */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative flex items-start justify-end gap-3"
          >
            {/* main room image */}
            <div className="relative aspect-[4/5] w-[60%] overflow-hidden rounded-sm bg-panel">
              <Image
                src="/demo-capture/empty-room-01.png"
                alt="Curated living space"
                fill
                className="object-cover"
                priority
              />
              <span className="mono absolute bottom-3 left-3 text-[11px] font-medium text-white/80">
                (01)
              </span>
            </div>

            {/* stacked secondary images */}
            <div className="flex w-[36%] flex-col gap-3">
              <div className="relative aspect-square overflow-hidden rounded-sm bg-panel">
                <Image
                  src="/demo-products/camel-chair.png"
                  alt="Camel lounge chair"
                  fill
                  className="object-cover"
                />
                <span className="mono absolute bottom-2 right-2 text-[11px] font-medium text-white/80">
                  (02)
                </span>
              </div>
              <div className="relative aspect-square overflow-hidden rounded-sm bg-panel">
                <Image
                  src="/demo-products/brass-lamp.png"
                  alt="Brass floor lamp"
                  fill
                  className="object-cover"
                />
                <span className="mono absolute bottom-2 right-2 text-[11px] font-medium text-white/80">
                  (03)
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ──────────────── dark editorial band ──────────────── */}
      <div className="relative bg-ink px-5 py-16 text-white md:px-10 md:py-24">
        <div className="mx-auto max-w-[1400px]">
          {/* handwritten tagline */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-10 text-center text-[clamp(18px,2.8vw,32px)] italic leading-snug text-white/60 md:mb-14"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Each piece carries a story
            <br />
            of rarity and timeless design.
          </motion.p>

          {/* featured product image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="relative mx-auto aspect-[16/9] max-w-[900px] overflow-hidden rounded-sm"
          >
            <Image
              src="/demo-capture/empty-room-03.png"
              alt="Featured interior"
              fill
              className="object-cover"
            />
          </motion.div>

          {/* bottom columns: brand + script wordmark + brand */}
          <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-3 md:items-end">
            <p className="mono text-[10px] font-medium uppercase leading-relaxed tracking-[0.12em] text-white/50">
              Sightline is a platform of curated one-of-a-kind pieces that preserves
              stories of art and craft for contemporary interiors.
            </p>

            <div className="flex justify-center">
              <span
                className="text-[clamp(42px,6vw,72px)] text-white/90"
                style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic' }}
              >
                Sightline
              </span>
            </div>

            <p className="mono text-right text-[10px] font-medium uppercase leading-relaxed tracking-[0.12em] text-white/50">
              Sightline is a platform of curated one-of-a-kind pieces that preserves
              stories of art and craft for contemporary interiors.
            </p>
          </div>
        </div>
      </div>

      {/* ────────────── identity footer bar ────────────── */}
      <div className="flex items-center justify-between border-t border-rule px-6 py-3 md:px-10">
        <span className="mono text-[11px] font-medium uppercase tracking-[0.2em] text-ash">
          Identity
        </span>
        <span className="mono text-[11px] font-medium text-ash">
          2025
        </span>
      </div>

      {/* ──────────── CTA overlay (keep existing actions) ──────────── */}
      <div className="relative bg-paper px-5 py-12 text-center md:py-16">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="display-lg mx-auto text-[clamp(32px,6vw,64px)]"
        >
          Engineered for Living
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-ash"
        >
          Explore the first room editor you can furnish from. Photograph a space, place
          pieces measured to fit, buy them wherever they cost least.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32 }}
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
          transition={{ delay: 0.45 }}
          className="mt-5 text-[12px] text-ash"
        >
          No credit card. No measuring tape. Six photos is enough.
        </motion.div>
      </div>
    </section>
  );
}
