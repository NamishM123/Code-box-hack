"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Glyph } from "./Glyphs";

export function AllInOne() {
  const cards = [
    { n: "01", title: "Capture", body: "Six to twelve photos from the corners of the room. Sightline reads the walls, the door swing, the windows, and the pieces you are keeping.", art: <ArtCapture /> },
    { n: "02", title: "Plan", body: "You get an editable floor plan with real feet and inches on it, not a mood board. Correct anything that looks wrong before a single piece is placed.", art: <ArtPlan /> },
    { n: "03", title: "Place", body: "Three layouts per room. Every sofa, table, and television lands with a one-line reason, and anything that would block a walkway is refused.", art: <ArtPlace /> },
    { n: "04", title: "Shop", body: "One list, priced at Amazon, Target, Walmart, and Facebook Marketplace at the same moment. Buy the room, or one piece at a time.", art: <ArtShop /> }
  ];

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h2 className="display-lg max-w-2xl text-[clamp(30px,4.4vw,58px)]">Your new all-in-one room editor.</h2>
        <Link href="/capture" className="group inline-flex items-center gap-2 text-[14px] font-medium">
          <span className="link-underline">See how it works</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
            className="card card-lift p-3"
          >
            <div className="relative h-44 overflow-hidden rounded-xl border border-rule bg-paper">{c.art}</div>
            <div className="px-1.5 pb-2 pt-4">
              <div className="mono text-[10px] text-ash">{c.n}</div>
              <div className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em]">{c.title}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-ash">{c.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- art -- */

function ArtCapture() {
  return (
    <div className="relative h-full w-full p-3">
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5">
        {[
          "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=240&q=70&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=240&q=70&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=240&q=70&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=240&q=70&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=240&q=70&auto=format&fit=crop"
        ].map((src) => (
          <img key={src} src={src} alt="" className="h-full w-full rounded-md object-cover" />
        ))}
        <div className="grid place-items-center rounded-md border border-dashed border-ink/25 text-ink/40">
          <Glyph name="camera" className="h-5 w-5" />
        </div>
      </div>
      <span className="absolute bottom-4 left-4 rounded-full bg-ink px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-paper">
        5 of 6 usable
      </span>
    </div>
  );
}

function ArtPlan() {
  return (
    <div className="plan-grid relative h-full w-full">
      <svg viewBox="0 0 200 130" className="absolute inset-0 h-full w-full">
        <path d="M24 20 H176 V110 H24 Z" fill="rgba(255,255,255,0.7)" stroke="#0C0C0D" strokeWidth="2" />
        <path d="M24 44 V72" stroke="#F0EFEC" strokeWidth="4" />
        <path d="M24 44 a28 28 0 0 1 28 28" fill="none" stroke="#0C0C0D" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        <path d="M104 20 H150" stroke="#2F5CFF" strokeWidth="4" />
        <text x="100" y="126" textAnchor="middle" fontSize="9" fill="#6E6C67" fontFamily="JetBrains Mono, monospace">14′ 0″</text>
        <text x="12" y="68" textAnchor="middle" fontSize="9" fill="#6E6C67" fontFamily="JetBrains Mono, monospace" transform="rotate(-90 12 68)">12′ 0″</text>
      </svg>
      <span className="absolute right-3 top-3 rounded-full border border-rule bg-white px-2 py-0.5 text-[9px] text-ash">confidence 86%</span>
    </div>
  );
}

function ArtPlace() {
  return (
    <div className="plan-grid relative h-full w-full">
      <svg viewBox="0 0 200 130" className="absolute inset-0 h-full w-full">
        <path d="M24 20 H176 V110 H24 Z" fill="rgba(255,255,255,0.7)" stroke="#0C0C0D" strokeWidth="2" />
        <rect x="38" y="30" width="62" height="20" rx="4" fill="#FF7A3D" opacity="0.85" />
        <rect x="44" y="62" width="46" height="16" rx="4" fill="#FFD36B" opacity="0.9" />
        <rect x="126" y="34" width="16" height="52" rx="4" fill="#0C0C0D" opacity="0.85" />
        <rect x="150" y="66" width="18" height="18" rx="4" fill="#6FA97F" opacity="0.9" />
        <rect x="34" y="26" width="78" height="60" rx="6" fill="none" stroke="#9B6BFF" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M112 90 H168" stroke="#2F5CFF" strokeWidth="1" strokeDasharray="3 2" />
        <text x="140" y="102" textAnchor="middle" fontSize="8" fill="#6E6C67" fontFamily="JetBrains Mono, monospace">34″ walkway</text>
      </svg>
      <span className="absolute left-3 top-3 rounded-full bg-ink px-2 py-0.5 text-[9px] font-medium text-paper">Command layout</span>
    </div>
  );
}

function ArtShop() {
  const rows = [
    { shop: "Amazon", price: "$219", best: false },
    { shop: "Walmart", price: "$198", best: true },
    { shop: "Target", price: "$229", best: false },
    { shop: "Marketplace", price: "$120", best: false }
  ];
  return (
    <div className="h-full w-full space-y-1.5 p-3">
      <div className="flex items-center gap-2 rounded-lg border border-rule bg-white px-2.5 py-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-butter/25 text-clay">
          <Glyph name="table" className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-medium">Round Oak Coffee Table</span>
      </div>
      {rows.map((r, i) => (
        <motion.div
          key={r.shop}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 + i * 0.07 }}
          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] ${r.best ? "bg-ink text-paper" : "border border-rule bg-white text-ash"}`}
        >
          <span>{r.shop}</span>
          <span className={r.best ? "font-semibold" : ""}>{r.price}</span>
        </motion.div>
      ))}
    </div>
  );
}
