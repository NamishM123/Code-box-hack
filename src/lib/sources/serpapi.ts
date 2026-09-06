import type { Category, Product, Source } from "../types";
import { isPlausiblePrice } from "../pricing";
import { guessColor, inferCategory, parseDimensions } from "./dimensions";
import { isAccessoryListing } from "./relevance";

/**
 * SerpAPI adapter. One key covers Google Shopping (which spans Target,
 * Wayfair, IKEA, West Elm and more) and Amazon.
 *
 * Docs: https://serpapi.com/google-shopping-api
 *       https://serpapi.com/amazon-search-api
 */

const BASE = "https://serpapi.com/search.json";

export interface SearchArgs {
  query: string;
  category: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export function hasSerpApi() {
  return Boolean(process.env.SERPAPI_KEY);
}

export async function searchGoogleShopping(args: SearchArgs): Promise<Product[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: args.query,
    api_key: key,
    hl: "en",
    gl: "us",
    num: String(args.limit ?? 20)
  });
  if (args.minPrice || args.maxPrice) {
    params.set("tbs", `mr:1,price:1,ppr_min:${Math.round(args.minPrice ?? 0)},ppr_max:${Math.round(args.maxPrice ?? 100000)}`);
  }

  const json = await getJson(`${BASE}?${params}`);
  const results: any[] = json?.shopping_results || [];

  return results
    .map((r) => normalize({
      id: `gs-${r.product_id || r.position}`,
      title: r.title,
      price: numericPrice(r.extracted_price ?? r.price),
      url: r.product_link || r.link,
      image: r.thumbnail,
      sourceName: r.source,
      rating: r.rating,
      snippet: [r.title, r.snippet, r.extensions?.join(" ")].filter(Boolean).join(" "),
      category: args.category
    }))
    .filter(Boolean) as Product[];
}

export async function searchAmazon(args: SearchArgs): Promise<Product[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    engine: "amazon",
    k: args.query,
    api_key: key,
    amazon_domain: "amazon.com"
  });

  // Amazon's own price refinement. p_36 takes cents, and an open upper
  // bound is written as "min-". Without it this engine ignored the band
  // entirely and returned $9 accessories next to $4,000 sectionals.
  const rh = amazonPriceRefinement(args.minPrice, args.maxPrice);
  if (rh) params.set("rh", rh);

  let json: any;
  try {
    json = await getJson(`${BASE}?${params}`);
  } catch (err) {
    // If the refinement is what the API objected to, the unfiltered
    // search is still worth having — the caller filters by price anyway.
    if (!rh) throw err;
    params.delete("rh");
    json = await getJson(`${BASE}?${params}`);
  }
  const results: any[] = json?.organic_results || [];

  return results
    .slice(0, args.limit ?? 20)
    .map((r) => normalize({
      id: `az-${r.asin || r.position}`,
      title: r.title,
      price: numericPrice(r.extracted_price ?? r.price),
      url: r.link,
      image: r.thumbnail,
      sourceName: "amazon",
      rating: r.rating,
      snippet: r.title,
      category: args.category
    }))
    .filter(Boolean) as Product[];
}

/* ---------- helpers ---------- */

interface Raw {
  id: string; title?: string; price: number; url?: string; image?: string;
  sourceName?: string; rating?: number; snippet: string; category: string;
}

function normalize(r: Raw): Product | null {
  if (!r.title || !r.url || !r.image || !r.price) return null;
  const category = (r.category === "auto" ? inferCategory(r.title) : r.category) as Category;
  // Prices no listing for this category could carry are parse failures or
  // accessories, not bargains.
  if (!isPlausiblePrice(category, r.price)) return null;
  if (isAccessoryListing(r.title, category)) return null;

  const dims = parseDimensions(r.snippet, category);
  return {
    id: r.id,
    title: r.title,
    price: Math.round(r.price),
    source: mapSource(r.sourceName),
    url: r.url,
    image: r.image,
    category,
    color: guessColor(r.title),
    width: dims.width,
    depth: dims.depth,
    height: dims.height,
    rating: r.rating,
    dimensionsVerified: dims.verified
  };
}

function amazonPriceRefinement(min?: number, max?: number): string | null {
  const lo = min && min > 0 ? Math.round(min * 100) : null;
  const hi = max && max > 0 ? Math.round(max * 100) : null;
  if (lo === null && hi === null) return null;
  return `p_36:${lo ?? ""}-${hi ?? ""}`;
}

function mapSource(name?: string): Source {
  const n = (name || "").toLowerCase();
  if (n.includes("amazon")) return "amazon";
  if (n.includes("target")) return "target";
  if (n.includes("wayfair")) return "wayfair";
  if (n.includes("ikea")) return "ikea";
  if (n.includes("west elm")) return "westelm";
  if (n.includes("cb2")) return "cb2";
  if (n.includes("article")) return "article";
  if (n.includes("facebook")) return "facebook";
  return "other";
}

/**
 * Listing prices arrive as numbers, as "$1,299.99", as ranges, and as
 * strings with an unrelated number in front ("Save $50, now $499"). The
 * old first-number-wins read priced that last one at $50, which is how a
 * $500 lamp ended up scoring as the best fit for a $60 slot.
 */
export function numericPrice(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : 0;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return numericPrice(o.extracted_value ?? o.value ?? o.amount ?? o.raw ?? o.price);
  }
  if (typeof v !== "string") return 0;

  const s = v.replace(/,/g, "");
  // A range ("$1,200 - $1,800") is quoted low-to-high; the low end is what
  // the listing actually sells at.
  const range = s.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:[-–—]|\bto\b)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (range) return Math.min(parseFloat(range[1]), parseFloat(range[2]));

  // Prefer numbers attached to a currency symbol over any bare number, and
  // drop the ones a discount word claims ("Save $50", "was $650") so the
  // price left over is what the listing actually sells at.
  const tagged: { value: number; start: number; end: number }[] = [];
  for (const m of s.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)) {
    tagged.push({ value: parseFloat(m[1]), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  if (tagged.length) {
    // "was $650" marks the price that follows it; "$50 off" marks the one
    // before it. Checking both lists against both sides let the "was" in
    // "$499, was $650" disqualify the $499 it had nothing to do with.
    const leading = /\b(save|was|were|reg|regularly|list|orig|originally|msrp|before|compare)\b/i;
    const trailing = /\b(off|discount)\b/i;
    const kept = tagged.filter((t) =>
      !leading.test(s.slice(Math.max(0, t.start - 16), t.start)) &&
      !trailing.test(s.slice(t.end, t.end + 12).split("$")[0])
    );
    // Every price claimed by a discount word ("$50 off $499") means the
    // largest is the item and the rest are the markdown.
    return kept.length ? Math.min(...kept.map((t) => t.value)) : Math.max(...tagged.map((t) => t.value));
  }

  const bare = s.match(/(\d+(?:\.\d+)?)/);
  return bare ? parseFloat(bare[1]) : 0;
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json();
  if (json.error) throw new Error(`SerpAPI: ${json.error}`);
  return json;
}
