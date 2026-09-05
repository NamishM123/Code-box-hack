"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Glyph } from "./Glyphs";

const MODES = [
  {
    key: "describe",
    label: "Describe",
    body: "Type warmer, cheaper, or smaller and the whole room re-shops itself against the same floor plan.",
    prompt: "warmer, under $1,500, nothing over 7 feet wide"
  },
  {
    key: "measure",
    label: "Measure",
    body: "Give an exact opening in inches. Every alternate is filtered to what physically clears the door and the walkway.",
    prompt: "max width 78in · depth 36in · door swing 32in"
  },
  {
    key: "compare",
    label: "Compare",
    body: "The same piece, priced at every shop at the same moment, delivery and pickup included.",
    prompt: "compare 4 shops · include marketplace listings"
  }
];

const ALTS = [
  { img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80&auto=format&fit=crop", title: "Belden Linen 3-Seater", shop: "Facebook Marketplace", price: "$649" },
  { img: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=500&q=80&auto=format&fit=crop", title: "Cloud Bouclé Modular", shop: "Amazon", price: "$1,290" },
  { img: "https://images.unsplash.com/photo-1550254478-ead40cc54513?w=500&q=80&auto=format&fit=crop", title: "Studio Velvet 2-Seater", shop: "Target", price: "$890" }
];

const SHOP_ROWS = [
  { shop: "Walmart", price: "$598", note: "2-day delivery", best: true },
  { shop: "Amazon", price: "$649", note: "Prime, 3 days", best: false },
  { shop: "Target", price: "$679", note: "Store pickup today", best: false },
  { shop: "Facebook Marketplace", price: "$420", note: "Local · 4 mi · used", best: false }
];

export function SwapShowcase() {
  const [active, setActive] = useState(0);
  const mode = MODES[active];

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-24 md:py-32">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        {/* -------------------------------------------------- live preview */}
        <div className="panel p-3">
          <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
            <span className="mono text-[11px] text-white/45">swap / sofa</span>
            <span className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] text-white/55">{mode.label.toLowerCase()}</span>
          </div>

          <div className="rounded-[20px] border border-white/[0.07] bg-black/25 p-3">
            <div className="mb-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              <Glyph name="swap" className="h-3.5 w-3.5 text-white/50" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={mode.key}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mono truncate text-[11px] text-white/70"
                >
                  {mode.prompt}
                </motion.span>
              </AnimatePresence>
              <span className="ml-auto h-3.5 w-[2px] animate-tick bg-butter" />
            </div>

            <AnimatePresence mode="wait">
              {active === 2 ? (
                <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                  {SHOP_ROWS.map((r, i) => (
                    <motion.div
                      key={r.shop}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[12px] ${r.best ? "bg-white text-ink" : "border border-white/10 bg-white/[0.04] text-white/75"}`}
                    >
                      <span className="font-medium">{r.shop}</span>
                      <span className="flex items-center gap-3">
                        <span className={r.best ? "text-ash" : "text-white/40"}>{r.note}</span>
                        <span className="mono font-semibold">{r.price}</span>
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="alts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-3 gap-2">
                  {ALTS.map((a, i) => (
                    <motion.div
                      key={a.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className={`overflow-hidden rounded-[14px] border ${i === active ? "border-butter" : "border-white/10"}`}
                    >
                      <img src={a.img} alt="" className="h-24 w-full object-cover md:h-28" />
                      <div className="bg-white/[0.04] p-2">
                        <div className="truncate text-[10px] font-medium text-white/85">{a.title}</div>
                        <div className="flex items-center justify-between text-[9px] text-white/45">
                          <span className="truncate">{a.shop}</span>
                          <span className="text-white/80">{a.price}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mono text-[10px] leading-relaxed text-white/55">
                <span className="text-butter">why</span> this piece · sits in command position, faces the door,
                leaves a 34in walkway to the television wall.
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- controls */}
        <div className="flex flex-col justify-center">
          <div className="eyebrow">Swap anything</div>
          <h2 className="display-lg mt-5 text-[clamp(38px,6vw,84px)]">Swap</h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ash">
            Nothing in a Sightline room is final. Every piece keeps a list of alternates ranked by how
            close they land to your palette, your budget, and the exact space they have to occupy.
          </p>

          <div className="mt-8 border-t border-rule">
            {MODES.map((m, i) => (
              <button
                key={m.key}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group block w-full border-b border-rule py-5 text-left"
              >
                <div className="flex items-baseline gap-4">
                  <span className="mono text-[11px] text-ash">0{i + 1}</span>
                  <span
                    className={`display-lg text-[clamp(26px,3.4vw,42px)] transition-colors duration-300 ${active === i ? "text-ink" : "text-ink/25"}`}
                  >
                    {m.label}
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {active === i && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                      className="overflow-hidden pl-9 text-[14px] leading-relaxed text-ash"
                    >
                      <span className="block pt-3">{m.body}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
