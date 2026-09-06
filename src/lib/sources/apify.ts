import type { Category, Product } from "../types";
import { isPlausiblePrice } from "../pricing";
import { guessColor, inferCategory, parseDimensions } from "./dimensions";
import { isAccessoryListing } from "./relevance";

/**
 * Apify adapter for Facebook Marketplace and Pinterest.
 * Facebook has no public API, so a scraper actor is the only route.
 *
 * Actors: apify/facebook-marketplace-scraper
 *         apify/pinterest-scraper
 */

const API = "https://api.apify.com/v2";

export function hasApify() {
  return Boolean(process.env.APIFY_TOKEN);
}

export interface MarketplaceArgs {
  query: string;
  category: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export async function searchFacebookMarketplace(args: MarketplaceArgs): Promise<Product[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const actor = process.env.APIFY_FB_ACTOR || "apify~facebook-marketplace-scraper";
  const input = {
    keyword: args.query,
    city: args.city || "newyork",
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
    maxItems: args.limit ?? 20
  };

  // run-sync-get-dataset-items blocks until the actor finishes and returns rows
  const res = await fetch(`${API}/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=90`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${await res.text().catch(() => "")}`);

  const rows: any[] = await res.json();
  return rows
    .map((r) => {
      const title: string = r.title || r.marketplace_listing_title || "";
      const price = numeric(r.price ?? r.listing_price?.amount);
      const image: string = r.image || r.primary_listing_photo?.image?.uri || r.photos?.[0];
      const url: string = r.url || (r.id ? `https://facebook.com/marketplace/item/${r.id}` : "");
      if (!title || !price || !image || !url) return null;

      const category = (args.category === "auto" ? inferCategory(title) : args.category) as Category;
      // Marketplace is where the parts-and-covers listings live, and the
      // actor honours minPrice inconsistently, so re-check both here.
      if (!isPlausiblePrice(category, price)) return null;
      if (isAccessoryListing(title, category)) return null;

      const dims = parseDimensions([title, r.description].filter(Boolean).join(" "), category);
      return {
        id: `fb-${r.id || url}`,
        title,
        price: Math.round(price),
        source: "facebook" as const,
        url,
        image,
        category,
        color: guessColor(title),
        width: dims.width,
        depth: dims.depth,
        height: dims.height,
        dimensionsVerified: dims.verified,
        location: r.location?.reverse_geocode?.city
      };
    })
    .filter(Boolean) as Product[];
}

/** Pull the source images off a Pinterest board or pin for vibe extraction. */
export async function scrapePinterest(url: string, limit = 12): Promise<string[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const actor = process.env.APIFY_PINTEREST_ACTOR || "apify~pinterest-scraper";
  const res = await fetch(`${API}/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=90`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startUrls: [{ url }], maxItems: limit })
  });
  if (!res.ok) throw new Error(`Apify ${res.status}`);

  const rows: any[] = await res.json();
  return rows
    .map((r) => r.imageUrl || r.image || r.images?.orig?.url || r.media?.images?.originals?.url)
    .filter(Boolean)
    .slice(0, limit);
}

function numeric(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }
  return 0;
}
