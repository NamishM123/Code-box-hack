import { NextResponse } from "next/server";
import { fetchCategory, hasAnyLiveSource } from "@/lib/sources/fanout";
import { SAMPLE_CATALOG } from "@/lib/catalog";
import type { Category, Product } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Shop one inspiration image, piece by piece.
 *
 * The point is to match the picture, not to fill a room. If the photo shows a
 * bed, two nightstands and a plant, this returns four groups and nothing else.
 * It used to search a fixed category mix per room type and hand back four
 * options across six categories — two dozen products for a photo containing
 * four, which then all got crammed into the plan.
 *
 * Each group carries its own query, taken from what the vision pass saw in the
 * picture ("black metal platform bed queen"), so the options are that piece
 * rather than that category.
 */

/** Two per piece: enough to choose, few enough to actually look at. */
const PER_ITEM = 2;

/** A photo with more than this in it stops being a room worth copying. */
const MAX_ITEMS = 8;

/**
 * Only used when the vision pass could not read the image — no key, or a
 * fetch that failed. Small on purpose: a wrong guess of three pieces is far
 * less wrong than a right guess of twenty.
 */
const FALLBACK_ITEMS: Record<string, { category: Category; label: string; searchTerm: string; want: string[] }[]> = {
  bedroom: [
    { category: "bed", label: "The bed", searchTerm: "platform bed queen", want: [] },
    { category: "nightstand", label: "The nightstand", searchTerm: "wood nightstand", want: [] },
    { category: "lamp", label: "The lamp", searchTerm: "table lamp", want: [] }
  ],
  bathroom: [
    { category: "mirror", label: "The mirror", searchTerm: "arched bathroom mirror", want: [] },
    { category: "shelf", label: "The shelving", searchTerm: "bathroom shelf unit", want: [] },
    { category: "plant", label: "The plant", searchTerm: "potted plant indoor", want: [] }
  ],
  office: [
    { category: "desk", label: "The desk", searchTerm: "wood writing desk", want: [] },
    { category: "chair", label: "The chair", searchTerm: "office chair", want: [] },
    { category: "shelf", label: "The shelving", searchTerm: "bookshelf", want: [] }
  ],
  "living-room": [
    { category: "sofa", label: "The sofa", searchTerm: "fabric 3 seater sofa", want: [] },
    { category: "table", label: "The coffee table", searchTerm: "wood coffee table", want: [] },
    { category: "rug", label: "The rug", searchTerm: "area rug 8x10", want: [] }
  ],
  any: [
    { category: "sofa", label: "The seating", searchTerm: "fabric sofa", want: [] },
    { category: "table", label: "The table", searchTerm: "wood coffee table", want: [] },
    { category: "lamp", label: "The lamp", searchTerm: "floor lamp", want: [] }
  ]
};

interface LookItemIn {
  category?: string;
  label?: string;
  searchTerm?: string;
  color?: string;
  material?: string;
  widthFt?: number;
  depthFt?: number;
  x?: number;
  y?: number;
  backsTo?: string;
}

interface LookBody {
  /** What the vision pass saw in the picture. The whole point. */
  items?: LookItemIn[];
  /** Words describing the overall look, folded into every per-piece query. */
  styleWords?: string[];
  room?: string;
  budget?: number;
  widthFt?: number;
  depthFt?: number;
}

export interface LookGroup {
  category: Category;
  label: string;
  query: string;
  options: Product[];
  /** Where this piece stood in the picture, passed through for the layout. */
  x?: number;
  y?: number;
  backsTo?: string;
}

const KNOWN: Category[] = [
  "sofa", "chair", "table", "bed", "rug", "lamp", "shelf",
  "plant", "art", "desk", "dresser", "nightstand", "mirror", "tv"
];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as LookBody;

  const room = body.room && FALLBACK_ITEMS[body.room] ? body.room : "any";
  const budget = clampNum(body.budget, 2500, 100, 100000);

  const detected = normalizeItems(body.items);
  const items: ReturnType<typeof normalizeItems> = detected.length ? detected : FALLBACK_ITEMS[room];

  // Two or three words of overall style, folded into each per-piece query so a
  // "platform bed" comes back in the picture's material and colour. Kept short
  // because the piece's own description is already doing the work.
  const style = (body.styleWords || [])
    .map((w) => String(w).replace(/[^\p{L}\p{N}\s&'-]/gu, " ").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");

  if (!hasAnyLiveSource()) {
    return NextResponse.json({
      groups: items.map((it) => ({
        category: it.category,
        label: it.label,
        query: it.searchTerm,
        options: SAMPLE_CATALOG.filter((p) => p.category === it.category).slice(0, PER_ITEM),
        x: it.x,
        y: it.y,
        backsTo: it.backsTo
      })),
      live: false,
      notes: ["Using the seed catalog. Add SERPAPI_KEY for live listings."]
    });
  }

  const perItem = Math.round(budget / Math.max(1, items.length));
  const notes: string[] = [];

  const settled = await Promise.allSettled(
    items.map((it) => fetchCategory(it.category, `${style} ${it.searchTerm}`.trim(), perItem))
  );

  const seenUrl = new Set<string>();
  const groups: LookGroup[] = [];

  settled.forEach((s, i) => {
    const it = items[i];
    if (s.status !== "fulfilled") {
      notes.push(`${it.category}: ${String(s.reason?.message || s.reason).slice(0, 120)}`);
      return;
    }
    const options = s.value
      .filter((p) => p.url && p.image && !seenUrl.has(p.url))
      .filter((p) => fitsRoom(p, body.widthFt, body.depthFt))
      .sort((a, b) => score(b, perItem, it.want) - score(a, perItem, it.want))
      .slice(0, PER_ITEM);

    for (const p of options) seenUrl.add(p.url);
    if (options.length) {
      groups.push({
        category: it.category,
        label: it.label,
        query: it.searchTerm,
        options,
        x: it.x,
        y: it.y,
        backsTo: it.backsTo
      });
    }
  });

  return NextResponse.json({
    groups,
    live: true,
    itemCount: items.length,
    notes
  });
}

function normalizeItems(raw?: LookItemIn[]): { category: Category; label: string; searchTerm: string; want: string[]; x?: number; y?: number; backsTo?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i?.category && i?.searchTerm)
    .slice(0, MAX_ITEMS)
    .map((i) => {
      const c = String(i.category).toLowerCase().trim();
      const category = (KNOWN.find((k) => k === c) || KNOWN.find((k) => c.includes(k)) || "table") as Category;
      // The colour and material of the piece in the photograph. These go into
      // the query AND into the ranking: a search for a black metal task lamp
      // still returns terracotta ceramic ones, and without checking, the first
      // one wins.
      const want = [i.color, i.material]
        .filter(Boolean)
        .flatMap((v) => String(v).toLowerCase().split(/[^a-z]+/))
        .filter((w) => w.length > 2)
        .slice(0, 6);

      return {
        category,
        label: String(i.label || category).slice(0, 120),
        searchTerm: String(i.searchTerm).replace(/[^\p{L}\p{N}\s&'-]/gu, " ").trim().slice(0, 80),
        want,
        x: typeof i.x === "number" ? i.x : undefined,
        y: typeof i.y === "number" ? i.y : undefined,
        backsTo: ["N", "E", "S", "W", "none"].includes(String(i.backsTo)) ? String(i.backsTo) : undefined
      };
    })
    .filter((i) => i.searchTerm);
}

/** Only excludes on size when the room is actually known. */
function fitsRoom(p: Product, widthFt?: number, depthFt?: number): boolean {
  if (!widthFt || !depthFt) return true;
  return p.width < widthFt - 1 && p.depth < depthFt - 1;
}

/**
 * Looking like the piece in the photograph outweighs everything else.
 *
 * A query for "black metal articulated task lamp" still comes back with
 * terracotta ceramic ones, and price alone happily ranks those first — which
 * is how a picture with a slim black task lamp produced two $899 clay lamps.
 * Every colour or material word the photo gave us that also appears in the
 * listing's title is worth more than a good price.
 */
function score(p: Product, target: number, want: string[] = []): number {
  const priceFit = 1 - Math.min(1, Math.abs(p.price - target) / Math.max(target, 1));
  const rating = (p.rating || 4) / 5;
  const measured = p.dimensionsVerified === false ? 0 : 1;
  const pictured = p.photoVerified ? 1 : 0;

  const title = p.title.toLowerCase();
  const hits = want.filter((w) => title.includes(w)).length;
  const looksRight = want.length ? (hits / want.length) * 6 : 0;

  return looksRight + priceFit * 2 + rating + measured * 1.5 + pictured * 0.5;
}

function clampNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
