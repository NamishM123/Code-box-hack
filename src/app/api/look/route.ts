import { NextResponse } from "next/server";
import { fetchCategory, hasAnyLiveSource } from "@/lib/sources/fanout";
import { recommend } from "@/lib/recommend";
import type { Category, Product } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Shop one inspiration image.
 *
 * /api/search furnishes a whole room: one product per category, inside a
 * budget. This is the other shape — a shoppable spread for a single Pinterest
 * pin, several options per category, ranked, so the reader can browse what the
 * picture is actually made of before committing to a room.
 *
 * The style words come from whatever read the image: Gemini's search terms
 * when GOOGLE_AI_API_KEY is set, otherwise the local palette reader's tags.
 */

/**
 * Keyed by the Pinterest tab, not by RoomType — a bathroom has no sofa, and
 * the layout engine's four room types don't have a bathroom.
 *
 * Every mix is capped at six because each category costs two SerpAPI searches
 * (Google Shopping + Amazon). Six categories is twelve searches per look, and
 * a free SerpAPI plan is 100 searches a month.
 */
const ROOM_MIX: Record<string, Category[]> = {
  any: ["sofa", "chair", "table", "rug", "lamp", "art"],
  "living-room": ["sofa", "chair", "table", "rug", "lamp", "art"],
  bedroom: ["bed", "nightstand", "dresser", "rug", "lamp", "mirror"],
  bathroom: ["mirror", "shelf", "lamp", "art", "plant"],
  office: ["desk", "chair", "shelf", "lamp", "plant", "art"],
  studio: ["sofa", "bed", "table", "rug", "lamp", "shelf"]
};

/** Per category, so one crowded category can't swamp the spread. */
const PER_CATEGORY = 4;
const MAX_STYLE_WORDS = 12;

interface LookBody {
  searchTerms?: string[];
  styleTags?: string[];
  /** The Pinterest room tab: any | bedroom | bathroom | office | living-room. */
  room?: string;
  budget?: number;
  /** When the reader already has a room, sized results are filtered to fit. */
  widthFt?: number;
  depthFt?: number;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as LookBody;

  const room = body.room && ROOM_MIX[body.room] ? body.room : "any";
  const categories = ROOM_MIX[room];
  const budget = clampNum(body.budget, 2500, 100, 100000);

  // Gemini's terms first, the local reader's tags as backup. Capped so a long
  // tag list can't turn into an unusably specific query.
  const styleWords = [...(body.searchTerms || []), ...(body.styleTags || [])]
    .map((w) => String(w).replace(/[^\p{L}\p{N}\s&'-]/gu, " ").trim())
    .filter(Boolean)
    .slice(0, MAX_STYLE_WORDS)
    .join(" ");

  if (!hasAnyLiveSource()) {
    // No key: still show something shoppable from the seed catalog.
    const seed = recommend({
      widthFt: body.widthFt ?? 14,
      depthFt: body.depthFt ?? 12,
      budget,
      style: "warm-minimal",
      mustHave: categories
    });
    return NextResponse.json({
      products: seed,
      live: false,
      styleWords,
      notes: ["Using the seed catalog. Add SERPAPI_KEY for live listings."]
    });
  }

  const perItem = Math.round(budget / Math.max(1, categories.length));
  const notes: string[] = [];

  const batches = await Promise.allSettled(
    categories.map((c) => fetchCategory(c, styleWords, perItem))
  );

  const pool: Product[] = [];
  batches.forEach((b, i) => {
    if (b.status === "fulfilled") pool.push(...b.value);
    else notes.push(`${categories[i]}: ${String(b.reason?.message || b.reason).slice(0, 120)}`);
  });

  if (!pool.length) {
    return NextResponse.json({
      products: [],
      live: true,
      styleWords,
      notes: notes.length ? notes : ["No live listings came back for this look."]
    });
  }

  const products = rank(pool, categories, perItem, body.widthFt, body.depthFt);

  return NextResponse.json({
    products,
    live: true,
    styleWords,
    poolSize: pool.length,
    notes
  });
}

/**
 * Ranked, deduped, and interleaved so the top of the spread reads as a room
 * rather than eight sofas. A listing whose dimensions were only inferred is
 * kept — it is still shoppable, and it carries dimensionsVerified:false so the
 * UI can badge it as an estimate — but a listing with real published
 * dimensions outranks one without at the same price.
 */
function rank(
  pool: Product[],
  categories: Category[],
  target: number,
  widthFt?: number,
  depthFt?: number
): Product[] {
  const byCat = new Map<Category, Product[]>();
  const seenUrl = new Set<string>();

  for (const p of pool) {
    if (!p.url || seenUrl.has(p.url)) continue;
    seenUrl.add(p.url);
    // Only exclude on size when we actually know the room.
    if (widthFt && depthFt && p.width >= widthFt - 1) continue;
    if (widthFt && depthFt && p.depth >= depthFt - 1) continue;
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }

  for (const [, list] of byCat) {
    list.sort((a, b) => score(b, target) - score(a, target));
    list.splice(PER_CATEGORY);
  }

  // Round-robin across categories: one of each, then the seconds, and so on.
  const out: Product[] = [];
  for (let i = 0; i < PER_CATEGORY; i++) {
    for (const c of categories) {
      const item = byCat.get(c)?.[i];
      if (item) out.push(item);
    }
  }
  return out;
}

function score(p: Product, target: number): number {
  const priceFit = 1 - Math.min(1, Math.abs(p.price - target) / Math.max(target, 1));
  const rating = (p.rating || 4) / 5;
  const measured = p.dimensionsVerified === false ? 0 : 1;
  const pictured = p.photoVerified ? 1 : 0;
  return priceFit * 2 + rating + measured * 1.5 + pictured * 0.5;
}

function clampNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
