"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Glyph, type GlyphName } from "./Glyphs";

type Token = { w: string } | { chip: GlyphName; bg: string; fg: string };

/** The Butter move: one long sentence, revealed word by word, with product
 *  glyphs set inline like punctuation. */
const SENTENCE: Token[] = [
  { w: "Sightline" },
  { chip: "sofa", bg: "linear-gradient(150deg,#FF7A3D,#E8410F)", fg: "#FFF6F0" },
  { w: "is" }, { w: "the" }, { w: "first" }, { w: "room" },
  { chip: "ruler", bg: "linear-gradient(150deg,#FFD36B,#EDA51F)", fg: "#3A2405" },
  { w: "editor" }, { w: "where" }, { w: "anyone" }, { w: "can" },
  { chip: "camera", bg: "linear-gradient(150deg,#2B2B31,#0C0C0D)", fg: "#F2F1EE" },
  { w: "photograph" }, { w: "a" }, { w: "space," }, { w: "fill" }, { w: "it" }, { w: "with" }, { w: "furniture" },
  { chip: "tv", bg: "linear-gradient(150deg,#4B76FF,#1E3ACF)", fg: "#F1F4FF" },
  { w: "that" }, { w: "measurably" }, { w: "fits," }, { w: "and" },
  { chip: "cart", bg: "linear-gradient(150deg,#6FA97F,#33654A)", fg: "#F0FAF2" },
  { w: "buy" }, { w: "every" }, { w: "piece" }, { w: "from" }, { w: "whichever" }, { w: "shop" }, { w: "sells" }, { w: "it" }, { w: "cheapest." }
];

export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  // every token finishes revealing by the time the section is done scrolling
  const span = 0.72 / SENTENCE.length;

  return (
    <section id="product" className="mx-auto max-w-[1180px] px-5 py-28 md:py-40">
      <div ref={ref} className="display-lg flex flex-wrap justify-center gap-x-[0.28em] gap-y-[0.12em] text-center text-[clamp(28px,4.6vw,60px)]">
        {SENTENCE.map((t, i) => (
          <Word key={i} progress={scrollYProgress} range={[i * span, i * span + 0.28]}>
            {"w" in t ? (
              t.w
            ) : (
              <span className="inline-chip" style={{ background: t.bg, color: t.fg }}>
                <Glyph name={t.chip} className="h-[62%] w-[62%]" strokeWidth={1.8} />
              </span>
            )}
          </Word>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
        <Metric value="6" label="photos to a floor plan" />
        <Metric value="12" label="shops priced at once" />
        <Metric value="1/4″" label="fit tolerance" />
        <Metric value="3" label="layouts per room" />
      </div>
    </section>
  );
}

function Word({ children, progress, range }: { children: React.ReactNode; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-flex items-center">
      {children}
    </motion.span>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="display-lg text-[34px] md:text-[40px]">{value}</div>
      <div className="mt-1 text-[12px] text-ash">{label}</div>
    </div>
  );
}
