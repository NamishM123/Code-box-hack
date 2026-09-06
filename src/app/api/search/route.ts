import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend";
import { hasSerpApi, searchAmazon, searchGoogleShopping } from "@/lib/sources/serpapi";
import { hasApify, searchFacebookMarketplace } from "@/lib/sources/apify";
import type { Category, Product, RoomSpec } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MIX: Record<string, Category[]> = {
  living: ["sofa", "chair", "table", "tv", "rug", "lamp", "shelf", "plant", "art"],
  bedroom: ["bed", "nightstand", "dresser", "rug", "lamp", "mirror", "art"],
  office: ["desk", "chair", "shelf", "lamp", "plant", "art"],
  studio: ["sofa", "bed", "table", "tv", "rug", "lamp", "shelf", "plant"]
};

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<RoomSpec> & { searchTerms?: string[]; live?: boolean };

  const spec: RoomSpec = {
    widthFt: body.widthFt ?? 14,
    depthFt: body.depthFt ?? 12,
    budget: body.budget ?? 2500,
    style: body.style ?? "warm-minimal",
    mustHave: body.mustHave ?? [],
    roomType: body.roomType,
    goal: body.goal,
    vibePalette: body.vibePalette,
    vibeTags: body.vibeTags
  };

  const wantLive = body.live !== false && (hasSerpApi() || hasApify());
  const notes: string[] = [];

  if (!wantLive) {
    const products = recommend(spec);
    return NextResponse.json({
      spec,
      products,
      total: products.reduce((s, p) => s + p.price, 0),
      live: false,
      notes: ["Using the seed catalog. Add SERPAPI_KEY or APIFY_TOKEN for live listings."]
    });
  }

  const categories = spec.mustHave.length ? spec.mustHave : DEFAULT_MIX[spec.roomType || "living"];
  const styleWords = (body.searchTerms?.length ? body.searchTerms : [spec.style.replace("-", " ")]).join(" ");
  const perItemBudget = Math.round(spec.budget / Math.max(1, categories.length));

  const batches = await Promise.allSettled(
    categories.map((category) => fetchCategory(category, styleWords, perItemBudget))
  );

  const pool: Product[] = [];
  batches.forEach((b, i) => {
    if (b.status === "fulfilled") pool.push(...b.value);
    else notes.push(`${categories[i]}: ${String(b.reason?.message || b.reason).slice(0, 120)}`);
  });

  if (!pool.length) {
    const products = recommend(spec);
    return NextResponse.json({
      spec,
      products,
      total: products.reduce((s, p) => s + p.price, 0),
      live: false,
      notes: notes.length ? notes : ["No live results came back. Falling back to the seed catalog."]
    });
  }

  const products = pickWithinBudget(pool, categories, spec);
  return NextResponse.json({
    spec,
    products,
    total: products.reduce((s, p) => s + p.price, 0),
    live: true,
    poolSize: pool.length,
    notes
  });
}

async function fetchCategory(category: Category, styleWords: string, maxPrice: number): Promise<Product[]> {
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

/**
 * Prefers listings with parsed dimensions, but per category: a category
 * whose listings rarely state dimensions in the title (sofas, commonly)
 * would otherwise be starved entirely just because other categories had
 * enough verified listings.
 */
function pickWithinBudget(pool: Product[], categories: Category[], spec: RoomSpec): Product[] {
  const byCat = new Map<Category, Product[]>();
  for (const p of pool) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }

  const roomArea = spec.widthFt * spec.depthFt;
  const chosen: Product[] = [];
  const seen = new Set<string>();
  let spent = 0;

  for (const cat of categories) {
    const slotsLeft = categories.length - chosen.length;
    const target = (spec.budget - spent) / Math.max(1, slotsLeft);

    const catPool = byCat.get(cat) || [];
    const verified = catPool.filter((p) => p.dimensionsVerified !== false);
    const candidates = verified.length ? verified : catPool;

    const options = candidates
      .filter((p) => !seen.has(p.id))
      .filter((p) => spent + p.price <= spec.budget)
      // reject anything that cannot physically fit the room
      .filter((p) => p.width < spec.widthFt - 1 && p.depth < spec.depthFt - 1)
      .filter((p) => p.width * p.depth < roomArea * 0.45)
      .sort((a, b) => score(b, target, spec) - score(a, target, spec));

    const pick = options[0];
    if (pick) { chosen.push(pick); seen.add(pick.id); spent += pick.price; }
  }

  return chosen;
}

function score(p: Product, targetPrice: number, spec: RoomSpec): number {
  const priceFit = 1 - Math.min(1, Math.abs(p.price - targetPrice) / Math.max(targetPrice, 1));
  const vibeHits = (p.vibe || []).filter((v) => spec.vibeTags?.includes(v)).length;
  const rating = (p.rating || 4) / 5;
  const verified = p.dimensionsVerified === false ? 0 : 1;
  return priceFit * 2 + vibeHits * 1.5 + rating + verified * 1.5;
}
