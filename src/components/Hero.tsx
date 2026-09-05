"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Camera } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(200,159,90,0.14),transparent)]" />
      <div className="mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-14 md:grid-cols-[1.15fr_1fr] md:pt-24">
        <div className="flex flex-col justify-center">
          <div className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-ash">
            <span>Issue N° 01</span><span className="text-rule">/</span><span>Room Editor</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-[64px] leading-[0.98] md:text-[104px]"
          >
            See the room<br />
            <span className="italic text-brass">before you buy.</span>
          </motion.h1>
          <p className="mt-8 max-w-lg text-[15px] leading-relaxed text-ash">
            A camera-first room editor. Guided photos become an editable room. Furniture is placed with fit
            rationale drawn from architectural and feng shui principles — not from a shopping feed.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/capture" className="btn btn-primary">
              <Camera className="h-4 w-4" /> Photograph a room
            </Link>
            <Link href="/canvas?demo=1" className="btn btn-ghost">
              Try the demo room <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-14 grid max-w-md grid-cols-3 divide-x divide-rule/50 text-center">
            <Stat n="6-12" l="photos to start" />
            <Stat n="3" l="layout options" />
            <Stat n="1 room" l="MVP focus" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="card vignette">
            <img
              src="https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1200&q=85&auto=format&fit=crop"
              alt=""
              className="aspect-[4/5] w-full object-cover"
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-[10px] uppercase tracking-[0.2em] text-paper/80">
              <span>Bedroom · 12′ × 11′</span>
              <span className="text-brass">Confidence 0.86</span>
            </div>
            <FloatingCard style={{ left: 16, bottom: 96 }} title="Boucle Upholstered Bed" body="Command position · faces door" price="$1,290" />
            <FloatingCard style={{ right: 16, top: 96 }} title="Arched Floor Mirror" body="Fakes light on two sides" price="$189" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-ash">
            <span>Fig. 01 — Command layout</span>
            <span>Total $2,140</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="px-3">
      <div className="font-display text-3xl">{n}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ash">{l}</div>
    </div>
  );
}

function FloatingCard({ style, title, body, price }: { style: React.CSSProperties; title: string; body: string; price: string }) {
  return (
    <div className="absolute w-56 rounded-md border border-brass/40 bg-ink/85 p-3 backdrop-blur animate-drift" style={style}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-brass">Placed</div>
      <div className="mt-1 font-display text-lg leading-tight">{title}</div>
      <div className="mt-1 text-[11px] text-ash">{body}</div>
      <div className="mt-2 text-sm">{price}</div>
    </div>
  );
}
