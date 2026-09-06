"use client";
import { motion } from "framer-motion";
import { Glyph } from "./Glyphs";

export function DuoCards() {
  return (
    <section className="mx-auto grid max-w-[1320px] gap-3 px-5 pb-8 md:grid-cols-2">
      <Card
        title="Turn any photo into a floor plan."
        body="Point a phone at the room you already live in. Sightline reads the corners, the door swing, and the window wall, then hands you a plan you can drag furniture across."
        art={<ArtMorph />}
      />
      <Card
        title="Real listings. Real dimensions."
        body="Every block is a live product page with its measurements parsed and verified. No renders of furniture that does not exist, and no listing that hides how big it is."
        art={<ArtVerify />}
      />
    </section>
  );
}

function Card({ title, body, art }: { title: string; body: string; art: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      className="card card-lift p-6 md:p-8"
    >
      <h3 className="display-lg max-w-sm text-[clamp(24px,2.6vw,34px)]">{title}</h3>
      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ash">{body}</p>
      <div className="mt-7">{art}</div>
    </motion.div>
  );
}

function ArtMorph() {
  return (
    <div className="panel relative h-[240px] overflow-hidden p-0">
      <div className="grid h-full grid-cols-2">
        <img
          src="https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=700&q=80&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="plan-grid-dark relative">
          <svg viewBox="0 0 200 240" className="absolute inset-0 h-full w-full">
            <path d="M28 40 H172 V206 H28 Z" fill="rgba(255,255,255,0.05)" stroke="#F2F1EE" strokeWidth="2" />
            <rect x="44" y="56" width="86" height="26" rx="6" fill="#FF7A3D" opacity="0.9" />
            <rect x="52" y="98" width="62" height="20" rx="5" fill="#FFD36B" opacity="0.9" />
            <rect x="146" y="96" width="18" height="60" rx="5" fill="#F2F1EE" opacity="0.85" />
            <rect x="44" y="140" width="26" height="26" rx="6" fill="#6FA97F" opacity="0.9" />
            <path d="M28 120 V166" stroke="#141416" strokeWidth="5" />
            <text x="100" y="226" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.55)" fontFamily="JetBrains Mono, monospace">12′ 7″ × 10′ 1″</text>
          </svg>
        </div>
      </div>
      <motion.div
        initial={{ left: "20%" }}
        whileInView={{ left: "50%" }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        className="absolute inset-y-0 w-[2px] bg-butter"
      >
        <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-butter text-[10px] font-bold text-ink">
          ↔
        </span>
      </motion.div>
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">photo</span>
      <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">plan</span>
    </div>
  );
}

const FIELDS = [
  { k: "title", v: "Round Oak Coffee Table", ok: true },
  { k: "width_in", v: "38.0", ok: true },
  { k: "depth_in", v: "38.0", ok: true },
  { k: "height_in", v: "16.5", ok: true },
  { k: "shop", v: "walmart · in stock", ok: true },
  { k: "fit_status", v: "fits · 34in walkway kept", ok: true }
];

function ArtVerify() {
  return (
    <div className="panel h-[240px] p-4">
      <div className="flex items-center gap-2 pb-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white/80">
          <Glyph name="ruler" className="h-4 w-4" />
        </span>
        <span className="mono text-[11px] text-white/45">listing / verified</span>
        <span className="ml-auto rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">6/6 fields</span>
      </div>
      <div className="space-y-1.5">
        {FIELDS.map((f, i) => (
          <motion.div
            key={f.k}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5"
          >
            <span className="mono text-[11px] text-white/40">{f.k}</span>
            <span className="mono flex items-center gap-2 text-[11px] text-white/85">
              {f.v}
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-400/20 text-[8px] text-emerald-300">✓</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
