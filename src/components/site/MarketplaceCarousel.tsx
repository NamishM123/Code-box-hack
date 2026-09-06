"use client";
import { SHOPS } from "./Glyphs";

/**
 * The marketplace strip along the bottom of the landing page: every shop we
 * price against, rotating continuously, each wordmark a link out to that shop.
 * Doubling the list is what makes the loop seamless — the track translates
 * exactly half its width, so the second copy lands where the first began.
 */
export function MarketplaceCarousel() {
  const shops = SHOPS.filter((s) => s.href);
  const row = [...shops, ...shops];

  return (
    <div className="scroll-fade overflow-hidden">
      <div
        className="marquee-track flex w-max items-center gap-10 md:gap-14"
        style={{ ["--marquee-duration" as string]: "44s" }}
      >
        {row.map((s, i) => (
          <a
            key={`${s.name}-${i}`}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-hidden={i >= shops.length}
            tabIndex={i >= shops.length ? -1 : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap text-[17px] text-white/85 transition-colors duration-500 hover:text-white md:text-[20px] ${s.style}`}
          >
            {s.mark}
            {s.name}
          </a>
        ))}
      </div>
    </div>
  );
}
