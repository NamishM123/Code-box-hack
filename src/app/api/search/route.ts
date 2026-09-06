import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend";
import { allocateBudget, type PriceBand } from "@/lib/pricing";
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

  // Each category searches its own slice of the budget rather than an even
  // 1/N of it. A $2,500 living room is not eight $312 purchases.
  const bands = allocateBudget(categories, spec.budget);

  const batches = await Promise.allSettled(
    categories.map((category) => fetchCategory(category, styleWords, bands.get(category)))
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

  const { products, notes: pickNotes } = pickWithinBudget(pool, categories, spec, bands);
  const total = products.reduce((s, p) => s + p.price, 0);

  return NextResponse.json({
    spec,
    products,
    total,
    live: true,
    poolSize: pool.length,
    // What each category was allowed to cost, so an odd-looking result can
    // be read against the range it was searched in.
    bands: Object.fromEntries(
      categories.map((c) => {
        const b = bands.get(c);
        return [c, b ? { target: b.target, min: b.min, max: b.max } : null];
      })
    ),
    notes: [...notes, ...pickNotes]
  });
}

async function fetchCategory(category: Category, styleWords: string, band?: PriceBand): Promise<Product[]> {
  const query = `${styleWords} ${category}`.trim();
  const tasks: Promise<Product[]>[] = [];

  // The fetch band is wider than the band we select in: the APIs filter
  // server-side, so a category with nothing in its tight range has to have
  // something just outside it to fall back on.
  const minPrice = band?.fetchMin;
  const maxPrice = band?.fetchMax;

  if (hasSerpApi()) {
    tasks.push(searchGoogleShopping({ query, category, minPrice, maxPrice, limit: 12 }));
    tasks.push(searchAmazon({ query, category, minPrice, maxPrice, limit: 12 }));
  }
  if (hasApify()) {
    tasks.push(searchFacebookMarketplace({ query, category, minPrice, maxPrice, limit: 10 }));
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
function pickWithinBudget(
  pool: Product[],
  categories: Category[],
  spec: RoomSpec,
  bands: Map<Category, PriceBand>
): { products: Product[]; notes: string[] } {
  const byCat = new Map<Category, Product[]>();
  for (const p of pool) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }

  const notes: string[] = [];
  const chosen: Product[] = [];
  const seen = new Set<string>();
  let spent = 0;

  categories.forEach((cat, i) => {
    const band = bands.get(cat);
    const catPool = byCat.get(cat) || [];
    const verified = catPool.filter((p) => p.dimensionsVerified !== false);
    const candidates = (verified.length ? verified : catPool).filter(
      (p) => !seen.has(p.id) && fitsRoom(p, spec)
    );

    if (!candidates.length) {
      if (catPool.length) notes.push(`${cat}: no listing fit the room`);
      return;
    }

    // What is left, spread over what is still unbought. Categories that came
    // up empty hand their slice back to the ones still to come, instead of
    // the old count-of-picks arithmetic that quietly shrank every target
    // after the first miss and left the budget half spent.
    const remainingTarget = categories
      .slice(i)
      .reduce((s, c) => s + (bands.get(c)?.target ?? 0), 0);
    const scale = remainingTarget > 0
      ? clamp((spec.budget - spent) / remainingTarget, 0.5, 1.75)
      : 1;
    const target = Math.max(1, Math.round((band?.target ?? spec.budget / categories.length) * scale));

    const affordable = candidates.filter((p) => spent + p.price <= spec.budget);
    const inBand = band
      ? affordable.filter((p) => p.price >= band.min && p.price <= Math.round(band.max * scale))
      : affordable;

    // Widen rather than skip the category: a band with nothing in it should
    // cost a worse price fit, not an empty slot in the room.
    let options = inBand;
    if (!options.length) {
      options = affordable;
      if (affordable.length) notes.push(`${cat}: nothing in $${band?.min}-$${band?.max}, widened`);
    }
    if (!options.length) {
      notes.push(`${cat}: every listing was over the remaining budget`);
      return;
    }

    const pick = options.sort((a, b) => score(b, target, spec) - score(a, target, spec))[0];
    chosen.push(pick);
    seen.add(pick.id);
    spent += pick.price;
  });

  topUp(chosen, byCat, bands, spec, seen, spent);
  return { products: chosen, notes };
}

/**
 * Spend what the first pass left on the table. Picking the closest listing
 * to each target rounds down every time, so a $2,500 room routinely came
 * back as $1,600 of deliberately cheap furniture. Upgrades go to the
 * biggest pieces first: spare money belongs on the sofa, not the plant.
 */
function topUp(
  chosen: Product[],
  byCat: Map<Category, Product[]>,
  bands: Map<Category, PriceBand>,
  spec: RoomSpec,
  seen: Set<string>,
  spent: number
): void {
  let headroom = spec.budget - spent;
  if (headroom <= spec.budget * 0.12) return;

  const order = chosen
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (bands.get(b.p.category)?.target ?? 0) - (bands.get(a.p.category)?.target ?? 0));

  for (const { p, i } of order) {
    if (headroom <= 0) break;
    const band = bands.get(p.category);
    if (!band) continue;

    const ceiling = Math.min(band.max, p.price + headroom);
    if (ceiling <= p.price) continue;

    const better = (byCat.get(p.category) || [])
      .filter((c) => !seen.has(c.id) && c.price > p.price && c.price <= ceiling && fitsRoom(c, spec))
      .sort((a, b) => score(b, ceiling, spec) - score(a, ceiling, spec))[0];

    if (better && score(better, ceiling, spec) > score(p, ceiling, spec)) {
      headroom -= better.price - p.price;
      seen.delete(p.id);
      seen.add(better.id);
      chosen[i] = better;
    }
  }
}

/** Reject anything that cannot physically fit the room. */
function fitsRoom(p: Product, spec: RoomSpec): boolean {
  return (
    p.width < spec.widthFt - 1 &&
    p.depth < spec.depthFt - 1 &&
    p.width * p.depth < spec.widthFt * spec.depthFt * 0.45
  );
}

function score(p: Product, targetPrice: number, spec: RoomSpec): number {
  const priceFit = 1 - Math.min(1, Math.abs(p.price - targetPrice) / Math.max(targetPrice, 1));
  const vibeHits = (p.vibe || []).filter((v) => spec.vibeTags?.includes(v)).length;
  const rating = (p.rating || 4) / 5;
  const verified = p.dimensionsVerified === false ? 0 : 1;
  return priceFit * 2 + vibeHits * 1.5 + rating + verified * 1.5;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
