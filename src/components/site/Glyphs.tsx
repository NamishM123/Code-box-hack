/**
 * Furniture line glyphs. One vocabulary of shapes reused everywhere: the hero
 * charms, the inline chips in the statement copy, the block grid, the spec card.
 */

export type GlyphName =
  | "sofa" | "table" | "tv" | "lamp" | "chair" | "rug"
  | "bed" | "shelf" | "plant" | "mirror" | "desk" | "dresser"
  | "ruler" | "camera" | "cart" | "swap";

const PATHS: Record<GlyphName, JSX.Element> = {
  sofa: (
    <>
      <path d="M5.2 11.6V7.6A1.8 1.8 0 0 1 7 5.8h10a1.8 1.8 0 0 1 1.8 1.8v4" />
      <path d="M2.8 13.6a1.9 1.9 0 0 1 3.8 0v1.9h10.8v-1.9a1.9 1.9 0 0 1 3.8 0v3a1.7 1.7 0 0 1-1.7 1.7H4.5a1.7 1.7 0 0 1-1.7-1.7z" />
      <path d="M5.6 18.2V20.2M18.4 18.2V20.2" />
    </>
  ),
  table: (
    <>
      <rect x="2.8" y="7.6" width="18.4" height="2.6" rx="1.3" />
      <path d="M6.2 10.2V18.4M17.8 10.2V18.4" />
      <path d="M6.2 13.6h11.6" />
    </>
  ),
  tv: (
    <>
      <rect x="2.6" y="4.8" width="18.8" height="11.6" rx="2.2" />
      <path d="M12 16.4v2.6M8.8 19h6.4" />
      <path d="M6 8.2h5" />
    </>
  ),
  lamp: (
    <>
      <path d="M7.4 10.4 9.6 4.8h4.8l2.2 5.6z" />
      <path d="M12 10.4V18" />
      <path d="M8.6 18h6.8" />
    </>
  ),
  chair: (
    <>
      <path d="M6.8 4.2h10.4l-1 8.2H7.8z" />
      <rect x="5.2" y="12.4" width="13.6" height="3.2" rx="1.5" />
      <path d="M7.2 15.6 6.2 20.2M16.8 15.6l1 4.6" />
      <path d="M8.4 8.4h7.2" />
    </>
  ),
  rug: (
    <>
      <rect x="3.4" y="6.4" width="17.2" height="11.2" rx="2.6" />
      <rect x="6.6" y="9.4" width="10.8" height="5.2" rx="1.6" />
      <path d="M3.4 8.6H1.8M3.4 12H1.8M3.4 15.4H1.8M20.6 8.6h1.6M20.6 12h1.6M20.6 15.4h1.6" />
    </>
  ),
  bed: (
    <>
      <path d="M3 17.4v-6.6c0-.9.7-1.6 1.6-1.6h14.8c.9 0 1.6.7 1.6 1.6v6.6" />
      <path d="M3 17.4h18M4.6 17.4V20M19.4 17.4V20" />
      <rect x="6" y="5.6" width="5.4" height="3.6" rx="1.4" />
    </>
  ),
  shelf: (
    <>
      <rect x="4.4" y="3.4" width="15.2" height="17.2" rx="1.8" />
      <path d="M4.4 9.2h15.2M4.4 14.8h15.2" />
      <path d="M7.4 5.4v3.8M9.4 6.2v3M15.4 11.2v3.6" />
    </>
  ),
  plant: (
    <>
      <path d="M8.6 14h6.8l-.9 6.4H9.5z" />
      <path d="M12 14c0-4.1 2.6-6.8 6.2-6.8C18.2 11.3 15.6 14 12 14z" />
      <path d="M12 14c0-3.4-2.1-5.6-5.2-5.6C6.8 11.8 8.9 14 12 14z" />
      <path d="M12 14V9" />
    </>
  ),
  mirror: (
    <>
      <path d="M6.4 20.4V10.6a5.6 5.6 0 0 1 11.2 0v9.8z" />
      <path d="M9.4 20.4v-7a2.6 2.6 0 0 1 2.6-2.6" />
    </>
  ),
  desk: (
    <>
      <rect x="2.6" y="7.4" width="18.8" height="2.4" rx="1.2" />
      <path d="M4.8 9.8V18.6" />
      <rect x="12.6" y="9.8" width="6.6" height="6" rx="1.2" />
      <path d="M12.6 12.8h6.6M19.2 15.8v2.8" />
    </>
  ),
  dresser: (
    <>
      <rect x="4" y="4.6" width="16" height="13.2" rx="1.8" />
      <path d="M4 9h16M4 13.4h16" />
      <path d="M10.4 6.8h3.2M10.4 11.2h3.2M10.4 15.6h3.2" />
      <path d="M5.6 17.8V20M18.4 17.8V20" />
    </>
  ),
  ruler: (
    <>
      <rect x="2.4" y="8.2" width="19.2" height="7.6" rx="1.8" />
      <path d="M6.6 8.2v3M10.2 8.2v4.4M13.8 8.2v3M17.4 8.2v4.4" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8.4h3.6l1.5-2.2h7.8l1.5 2.2H21v10H3z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4.6h2.6l2.4 10.2h9.4l2-7.2H6.6" />
      <circle cx="9.4" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8.4h13.2L14 5" />
      <path d="M20 15.6H6.8L10 19" />
    </>
  )
};

export function Glyph({ name, className = "h-6 w-6", strokeWidth = 1.5 }: { name: GlyphName; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/**
 * Store wordmarks for the trust row. Set as type rather than uploaded brand
 * assets, drawn in a single ink weight so the row reads as one strip.
 */
export const SHOPS: { name: string; style: string; href: string; mark?: JSX.Element }[] = [
  {
    name: "amazon",
    style: "lowercase font-semibold tracking-[-0.04em]",
    href: "https://www.amazon.com",
    mark: (
      <svg viewBox="0 0 40 12" className="mt-0.5 h-2.5 w-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M2 4c6.5 5.4 29.5 5.4 36 0" />
      </svg>
    )
  },
  {
    name: "TARGET",
    style: "font-bold tracking-[0.02em]",
    href: "https://www.target.com",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    name: "Walmart",
    style: "font-semibold tracking-[-0.02em]",
    href: "https://www.walmart.com",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 3v5.4M12 15.6V21M4.2 7.5l4.7 2.7M15.1 13.8l4.7 2.7M4.2 16.5l4.7-2.7M15.1 10.2l4.7-2.7" />
      </svg>
    )
  },
  {
    name: "Facebook Marketplace",
    style: "font-medium tracking-[-0.02em]",
    href: "https://www.facebook.com/marketplace",
    mark: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M3.5 8.5 5.5 4h13l2 4.5" />
        <path d="M4.6 8.5v11h14.8v-11" />
        <path d="M3.5 8.5a2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0" />
      </svg>
    )
  },
  { name: "WAYFAIR", style: "font-semibold tracking-[0.06em]", href: "https://www.wayfair.com" },
  { name: "IKEA", style: "font-extrabold tracking-[0.04em]", href: "https://www.ikea.com" },
  { name: "West Elm", style: "font-normal tracking-[0.12em] uppercase", href: "https://www.westelm.com" },
  { name: "CB2", style: "font-bold tracking-[0.08em]", href: "https://www.cb2.com" },
  { name: "Article", style: "font-medium tracking-[-0.01em]", href: "https://www.article.com" },
  { name: "OfferUp", style: "font-semibold tracking-[-0.02em]", href: "https://offerup.com" },
  { name: "Craigslist", style: "font-normal tracking-[-0.01em]", href: "https://www.craigslist.org" },
  { name: "Overstock", style: "font-medium tracking-[0.02em]", href: "https://www.overstock.com" }
];
