"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Glyph, type GlyphName } from "./Glyphs";

type Tile =
  | { kind: "photo"; img: string; title: string; shop: string; price: string; fit: string }
  | { kind: "glyph"; name: GlyphName; title: string; sub: string; bg: string; fg: string };

const TILES: Tile[] = [
  { kind: "photo", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=80&auto=format&fit=crop", title: "Belden Linen 3-Seater", shop: "Facebook Marketplace", price: "$649", fit: "Fits · 6′6″" },
  { kind: "glyph", name: "tv", title: "65″ Television", sub: "Wall-mounted block", bg: "linear-gradient(150deg,#4B76FF,#1E3ACF)", fg: "#EEF2FF" },
  { kind: "photo", img: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=700&q=80&auto=format&fit=crop", title: "Round Oak Coffee Table", shop: "Walmart", price: "$219", fit: "Fits · 3′2″" },
  { kind: "photo", img: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=700&q=80&auto=format&fit=crop", title: "Arch Accent Chair", shop: "Target", price: "$349", fit: "Fits · 2′6″" },
  { kind: "glyph", name: "rug", title: "8 × 10 Area Rug", sub: "Anchors the seating", bg: "linear-gradient(150deg,#9B6BFF,#5B2FD1)", fg: "#F5F0FF" },
  { kind: "photo", img: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=700&q=80&auto=format&fit=crop", title: "Brass Arc Floor Lamp", shop: "Amazon", price: "$149", fit: "Fits · 6′2″" },
  { kind: "photo", img: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=700&q=80&auto=format&fit=crop", title: "Walnut 4-Tier Shelf", shop: "Wayfair", price: "$259", fit: "Tight · 3′2″" },
  { kind: "glyph", name: "dresser", title: "6-Drawer Dresser", sub: "Storage block", bg: "linear-gradient(150deg,#FFD36B,#EDA51F)", fg: "#3A2405" },
  { kind: "photo", img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&q=80&auto=format&fit=crop", title: "Low Platform Oak Bed", shop: "Facebook Marketplace", price: "$899", fit: "Fits · 6′6″" },
  { kind: "photo", img: "https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=700&q=80&auto=format&fit=crop", title: "Fiddle Leaf Fig, 5 ft", shop: "Amazon", price: "$79", fit: "Fits · 2′6″" }
];

const LAYERS = [
  { label: "Sofa", color: "#FF7A3D", start: 2, span: 30 },
  { label: "Rug", color: "#9B6BFF", start: 8, span: 46 },
  { label: "Television", color: "#4B76FF", start: 24, span: 22 },
  { label: "Lamp", color: "#FFD36B", start: 40, span: 18 },
  { label: "Coffee table", color: "#6FA97F", start: 52, span: 34 }
];

export function BlockStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["4%", "-22%"]);

  return (
    <section id="pieces" ref={ref} className="px-3 md:px-5">
      <div className="panel mx-auto max-w-[1320px] p-3 md:p-4">
        {/* editor chrome */}
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="mono ml-3 text-[11px] text-white/45">sightline / living-room-01 · 14′ × 12′</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/55">Library</span>
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink">Place</span>
          </div>
        </div>

        {/* block rail */}
        <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-black/25 p-3">
          <motion.div style={{ x }} className="flex w-max gap-3">
            {TILES.map((t, i) => (
              <div
                key={i}
                className="group relative h-[190px] w-[150px] shrink-0 overflow-hidden rounded-[16px] border border-white/10 md:h-[240px] md:w-[190px]"
                style={t.kind === "glyph" ? { background: t.bg, color: t.fg } : undefined}
              >
                {t.kind === "photo" ? (
                  <>
                    <img src={t.img} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3">
                      <div className="text-[11px] font-medium leading-tight text-white">{t.title}</div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-white/60">
                        <span>{t.shop}</span>
                        <span className="text-white/90">{t.price}</span>
                      </div>
                    </div>
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                      {t.fit}
                    </span>
                  </>
                ) : (
                  <div className="flex h-full flex-col justify-between p-4">
                    <Glyph name={t.name} className="h-10 w-10" strokeWidth={1.4} />
                    <div>
                      <div className="text-[13px] font-semibold leading-tight">{t.title}</div>
                      <div className="mt-0.5 text-[10px] opacity-70">{t.sub}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* placement timeline */}
        <div className="mt-3 space-y-1.5 rounded-[20px] border border-white/[0.07] bg-black/25 p-3">
          {LAYERS.map((l) => (
            <div key={l.label} className="flex items-center gap-3">
              <span className="mono w-24 shrink-0 truncate text-[10px] text-white/45">{l.label}</span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/[0.05]">
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
                  className="absolute inset-y-0 origin-left rounded-md"
                  style={{ left: `${l.start}%`, width: `${l.span}%`, background: l.color, opacity: 0.85 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
