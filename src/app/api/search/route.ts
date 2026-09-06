import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend";
import { hasSerpApi, searchAmazon, searchGoogleShopping } from "@/lib/sources/serpapi";
import { hasApify, searchFacebookMarketplace } from "@/lib/sources/apify";
import type { Category, Product, RoomSpec } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MIX: Record<string, Category[]> = {
  living: ["sofa", "chair", "table", "rug", "lamp", "shelf", "plant", "art"],
  bedroom: ["bed", "nightstand", "dresser", "rug", "lamp", "mirror", "art"],
  office: ["desk", "chair", "shelf", "lamp", "plant", "art"],
  studio: ["sofa", "bed", "table", "rug", "lamp", "shelf", "plant"]
};

interface SearchBody extends Partial<RoomSpec> {
  searchTerms?: string[];
  live?: boolean;
  /** Scope the search to one category (used by the Swap "describe" box). */
  onlyCategory?: Category;
  /** Free text from the describe box, e.g. "warmer, under $1,500". */
  describe?: string;
  /** How many ranked candidates to return for onlyCategory. */
  topN?: number;
}

const ALT_LIMIT = 6;

export async function POST(req: Request) {
  const body = (await req.json()) as SearchBody;

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

  // Scoped re-search for one category, driven by the Swap drawer's describe
  // box. Runs a fresh live query for just this category and returns several
  // ranked candidates rather than a single pick.
  if (body.onlyCategory) {
    if (!wantLive) {
      return NextResponse.json({ category: body.onlyCategory, alternates: [], live: false, notes: ["Add SERPAPI_KEY or APIFY_TOKEN for live alternates."] });
    }
    const target = Math.round(spec.budget / Math.max(1, spec.mustHave.length || 1));
    const styleWords = [body.describe, ...(body.searchTerms || []), body.describe ? "" : spec.style.replace("-", " ")]
      .filter(Boolean).join(" ");
    let found: Product[] = [];
    const notes: string[] = [];
    try {
      found = await fetchCategory(body.onlyCategory, styleWords, target);
    } catch (e) {
      notes.push(String((e as Error)?.message || e).slice(0, 160));
    }
    const ranked = rankCandidates(found, target, spec);
    return NextResponse.json({
      category: body.onlyCategory,
      alternates: ranked.slice(0, body.topN ?? ALT_LIMIT),
      live: true,
      poolSize: found.length,
      notes
    });
  }

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

  const { chosen: products, alternatesByCategory } = pickWithinBudget(pool, categories, spec);
  return NextResponse.json({
    spec,
    products,
    alternatesByCategory,
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
 * Ranks a category's pool for a target price: prefers listings with parsed
 * dimensions (falling back to the whole pool only if none are verified),
 * rejects anything that cannot physically fit the room, and sorts by fit.
 */
function rankCandidates(catPool: Product[], target: number, spec: RoomSpec): Product[] {
  const roomArea = spec.widthFt * spec.depthFt;
  const verified = catPool.filter((p) => p.dimensionsVerified !== false);
  const candidates = verified.length ? verified : catPool;

  return candidates
    .filter((p) => p.width < spec.widthFt - 1 && p.depth < spec.depthFt - 1)
    .filter((p) => p.width * p.depth < roomArea * 0.45)
    .sort((a, b) => score(b, target, spec) - score(a, target, spec));
}

/**
 * Picks one product per category within budget, per category: a category
 * whose listings rarely state dimensions in the title (sofas, commonly)
 * would otherwise be starved entirely just because other categories had
 * enough verified listings. Also returns several ranked runners-up per
 * category, live listings the Swap drawer can offer instead of just the
 * static seed catalog.
 */
function pickWithinBudget(pool: Product[], categories: Category[], spec: RoomSpec): { chosen: Product[]; alternatesByCategory: Partial<Record<Category, Product[]>> } {
  const byCat = new Map<Category, Product[]>();
  for (const p of pool) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }

  const chosen: Product[] = [];
  const seen = new Set<string>();
  const alternatesByCategory: Partial<Record<Category, Product[]>> = {};
  let spent = 0;

  for (const cat of categories) {
    const slotsLeft = categories.length - chosen.length;
    const target = (spec.budget - spent) / Math.max(1, slotsLeft);

    const ranked = rankCandidates(byCat.get(cat) || [], target, spec);
    alternatesByCategory[cat] = ranked.slice(0, ALT_LIMIT);

    const affordable = ranked.filter((p) => !seen.has(p.id) && spent + p.price <= spec.budget);
    const pick = affordable[0];
    if (pick) { chosen.push(pick); seen.add(pick.id); spent += pick.price; }
  }

  return { chosen, alternatesByCategory };
}

function score(p: Product, targetPrice: number, spec: RoomSpec): number {
  const priceFit = 1 - Math.min(1, Math.abs(p.price - targetPrice) / Math.max(targetPrice, 1));
  const vibeHits = (p.vibe || []).filter((v) => spec.vibeTags?.includes(v)).length;
  const rating = (p.rating || 4) / 5;
  const verified = p.dimensionsVerified === false ? 0 : 1;
  return priceFit * 2 + vibeHits * 1.5 + rating + verified * 1.5;
}
