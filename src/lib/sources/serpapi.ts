import type { Product, Source } from "../types";
import { guessColor, inferCategory, parseDimensions } from "./dimensions";

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
    params.set("tbs", `mr:1,price:1,ppr_min:${args.minPrice ?? 0},ppr_max:${args.maxPrice ?? 100000}`);
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

  const json = await getJson(`${BASE}?${params}`);
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
  const category = (r.category === "auto" ? inferCategory(r.title) : r.category) as Product["category"];
  const dims = parseDimensions(r.snippet, category);
  return {
    id: r.id,
    title: r.title,
    // a listing's own thumbnail is a photo of that listing's product
    photoVerified: true,
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

function numericPrice(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }
  return 0;
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text().catch(() => "")}`);
  const json = await res.json();
  if (json.error) throw new Error(`SerpAPI: ${json.error}`);
  return json;
}
