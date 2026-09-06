"use client";
import { SHOPS } from "./Glyphs";

/**
 * The trust strip. Butter runs client logos here; we run the shops we price
 * against, set in one ink weight so the row reads as a single line of type.
 */
export function ShopMarquee() {
  const row = [...SHOPS, ...SHOPS];
  return (
    <section id="shops" className="border-y border-rule/70 bg-card/40">
      <div className="mx-auto max-w-[1320px] px-5 pt-8">
        <div className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-ash">
          One room. Every shop. Priced side by side.
        </div>
      </div>
      <div className="scroll-fade overflow-hidden py-7">
        <div className="marquee-track flex w-max items-center gap-14" style={{ ["--marquee-duration" as string]: "46s" }}>
          {row.map((s, i) => (
            <span
              key={`${s.name}-${i}`}
              className={`flex shrink-0 items-center gap-2 text-[22px] text-ink/45 transition-colors duration-300 hover:text-ink md:text-[26px] ${s.style}`}
            >
              {s.mark}
              {s.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
