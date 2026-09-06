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
const FALLBACK_ITEMS: Record<string, { category: Category; label: string; searchTerm: string }[]> = {
  bedroom: [
    { category: "bed", label: "The bed", searchTerm: "platform bed queen" },
    { category: "nightstand", label: "The nightstand", searchTerm: "wood nightstand" },
    { category: "lamp", label: "The lamp", searchTerm: "table lamp" }
  ],
  bathroom: [
    { category: "mirror", label: "The mirror", searchTerm: "arched bathroom mirror" },
    { category: "shelf", label: "The shelving", searchTerm: "bathroom shelf unit" },
    { category: "plant", label: "The plant", searchTerm: "potted plant indoor" }
  ],
  office: [
    { category: "desk", label: "The desk", searchTerm: "wood writing desk" },
    { category: "chair", label: "The chair", searchTerm: "office chair" },
    { category: "shelf", label: "The shelving", searchTerm: "bookshelf" }
  ],
  "living-room": [
    { category: "sofa", label: "The sofa", searchTerm: "fabric 3 seater sofa" },
    { category: "table", label: "The coffee table", searchTerm: "wood coffee table" },
    { category: "rug", label: "The rug", searchTerm: "area rug 8x10" }
  ],
  any: [
    { category: "sofa", label: "The seating", searchTerm: "fabric sofa" },
    { category: "table", label: "The table", searchTerm: "wood coffee table" },
    { category: "lamp", label: "The lamp", searchTerm: "floor lamp" }
  ]
};

interface LookItemIn {
  category?: string;
  label?: string;
  searchTerm?: string;
  widthFt?: number;
  depthFt?: number;
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
}

const KNOWN: Category[] = [
  "sofa", "chair", "table", "bed", "rug", "lamp", "shelf",
  "plant", "art", "desk", "dresser", "nightstand", "mirror", "tv"
];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as LookBody;

  const room = body.room && FALLBACK_ITEMS[body.room] ? body.room : "any";
  const budget = clampNum(body.budget, 2500, 100, 100000);

  const items = normalizeItems(body.items).length
    ? normalizeItems(body.items)
    : FALLBACK_ITEMS[room];

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
        options: SAMPLE_CATALOG.filter((p) => p.category === it.category).slice(0, PER_ITEM)
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
      .sort((a, b) => score(b, perItem) - score(a, perItem))
      .slice(0, PER_ITEM);

    for (const p of options) seenUrl.add(p.url);
    if (options.length) {
      groups.push({ category: it.category, label: it.label, query: it.searchTerm, options });
    }
  });

  return NextResponse.json({
    groups,
    live: true,
    itemCount: items.length,
    notes
  });
}

function normalizeItems(raw?: LookItemIn[]): { category: Category; label: string; searchTerm: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => i?.category && i?.searchTerm)
    .slice(0, MAX_ITEMS)
    .map((i) => {
      const c = String(i.category).toLowerCase().trim();
      const category = (KNOWN.find((k) => k === c) || KNOWN.find((k) => c.includes(k)) || "table") as Category;
      return {
        category,
        label: String(i.label || category).slice(0, 120),
        searchTerm: String(i.searchTerm).replace(/[^\p{L}\p{N}\s&'-]/gu, " ").trim().slice(0, 80)
      };
    })
    .filter((i) => i.searchTerm);
}

/** Only excludes on size when the room is actually known. */
function fitsRoom(p: Product, widthFt?: number, depthFt?: number): boolean {
  if (!widthFt || !depthFt) return true;
  return p.width < widthFt - 1 && p.depth < depthFt - 1;
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
