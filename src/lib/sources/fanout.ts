import { hasSerpApi, searchAmazon, searchGoogleShopping } from "./serpapi";
import { hasApify, searchFacebookMarketplace } from "./apify";
import type { Category, Product } from "../types";

/**
 * One category, every source we have a key for, in parallel.
 *
 * One SerpAPI key covers Google Shopping — which spans Target, Home Depot,
 * Wayfair, IKEA, West Elm, Lowe's and Overstock — plus Amazon directly.
 * Apify adds Facebook Marketplace. A source that throws is dropped rather
 * than failing the whole fan-out.
 *
 * Shared by /api/search (furnishing a whole room) and /api/look (shopping a
 * single inspiration image), so both spend the same key the same way.
 */
export async function fetchCategory(
  category: Category,
  styleWords: string,
  maxPrice: number
): Promise<Product[]> {
  const query = `${styleWords} ${category}`.trim();
  const tasks: Promise<Product[]>[] = [];

  if (hasSerpApi()) {
    tasks.push(searchGoogleShopping({ query, category, maxPrice: maxPrice * 2, limit: 12 }));
    tasks.push(searchAmazon({ query, category, limit: 12 }));
  }
  if (hasApify()) {
    tasks.push(searchFacebookMarketplace({ query, category, maxPrice: maxPrice * 2, limit: 10 }));
  }

  const settled = await Promise.allSettled(tasks);
  const out: Product[] = [];
  for (const s of settled) if (s.status === "fulfilled") out.push(...s.value);
  return out;
}

export function hasAnyLiveSource() {
  return hasSerpApi() || hasApify();
}
