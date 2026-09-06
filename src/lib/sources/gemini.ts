import type { Category, DetectedRoom, Opening, RoomType } from "../types";

/**
 * Gemini vision adapter.
 *
 * Two jobs:
 *  1. analyzeRoom  — read room photos into geometry, openings, existing furniture.
 *  2. readVibe     — read an inspiration image (Pinterest) into palette + style tags.
 *
 * Per the spec: AI does perception and explanation. It never decides fit —
 * collision and clearance stay in deterministic code (src/lib/layout.ts).
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export function hasGemini() {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}

export interface InlineImage { mimeType: string; data: string }

const ROOM_SCHEMA = {
  type: "object",
  properties: {
    widthFt: { type: "number" },
    depthFt: { type: "number" },
    ceilingFt: { type: "number" },
    confidence: { type: "number" },
    scaleBasis: { type: "string" },
    lightingNote: { type: "string" },
    palette: { type: "array", items: { type: "string" } },
    openings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["door", "window"] },
          wall: { type: "string", enum: ["N", "S", "E", "W"] },
          positionFt: { type: "number" },
          widthFt: { type: "number" }
        },
        required: ["kind", "wall", "positionFt", "widthFt"]
      }
    },
    existing: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          widthFt: { type: "number" },
          depthFt: { type: "number" }
        },
        required: ["category", "label", "x", "y", "widthFt", "depthFt"]
      }
    }
  },
  required: ["widthFt", "depthFt", "confidence", "openings", "existing", "palette", "lightingNote"]
} as const;

const ROOM_PROMPT = `You are a spatial analyst reading photographs of a single room.

Return an approximate floor plan. Rules:
- Treat the room as a rectangle. Origin (0,0) is the top-left corner in plan view. X runs along the width (left to right), Y runs along the depth (top to bottom). Wall N is y=0, S is y=depth, W is x=0, E is x=width.
- Estimate dimensions in FEET. Use standard references visible in the photos to set scale: an interior door is about 2.6-3 ft wide and 6.7 ft tall, a standard outlet sits 12-16 in above the floor, a queen bed is 5 ft x 6.7 ft.
- "positionFt" for an opening is the distance from the start of that wall to the opening's near edge.
- For existing furniture, give the CENTER point (x, y) and the footprint in feet. Only include large items that constrain layout: bed, sofa, desk, dresser, table, large shelving. Skip small decor.
- "confidence" is 0 to 1. Be honest. Below 0.5 means the scale is a guess.
- "scaleBasis" names what you used to set scale, e.g. "interior door width".
- "palette" is 3-5 hex colors describing the room's existing finishes.
- "lightingNote" is one sentence about the natural light and what it implies.

Do not invent openings you cannot see. An empty array is a valid answer.`;

export async function analyzeRoom(images: InlineImage[], roomType: RoomType): Promise<DetectedRoom> {
  const json = await callGemini({
    prompt: `${ROOM_PROMPT}\n\nThe user says this is a ${roomType}.`,
    images,
    schema: ROOM_SCHEMA
  });

  const openings: Opening[] = (json.openings || [])
    .filter((o: any) => o?.kind && o?.wall)
    .map((o: any) => ({
      kind: o.kind === "door" ? "door" : "window",
      wall: (["N", "S", "E", "W"].includes(o.wall) ? o.wall : "N") as Opening["wall"],
      positionFt: clamp(num(o.positionFt), 0, 40),
      widthFt: clamp(num(o.widthFt, 3), 0.5, 12),
      swingFt: o.kind === "door" ? 3.2 : undefined
    }));

  const widthFt = clamp(num(json.widthFt, 14), 5, 40);
  const depthFt = clamp(num(json.depthFt, 12), 5, 40);

  const existing = (json.existing || [])
    .filter((e: any) => e?.category)
    .map((e: any) => ({
      category: normalizeCategory(e.category),
      label: String(e.label || e.category),
      x: clamp(num(e.x, widthFt / 2), 0, widthFt),
      y: clamp(num(e.y, depthFt / 2), 0, depthFt),
      widthFt: clamp(num(e.widthFt, 3), 0.5, widthFt),
      depthFt: clamp(num(e.depthFt, 2), 0.5, depthFt)
    }));

  return {
    widthFt,
    depthFt,
    openings,
    existing,
    confidence: clamp(num(json.confidence, 0.6), 0, 1),
    palette: (json.palette || []).filter(isHex).slice(0, 5),
    lightingNote: String(json.lightingNote || "Lighting could not be assessed from these photos.")
  };
}

const VIBE_SCHEMA = {
  type: "object",
  properties: {
    palette: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    materials: { type: "array", items: { type: "string" } },
    styleLabel: { type: "string" },
    searchTerms: { type: "array", items: { type: "string" } },
    note: { type: "string" }
  },
  required: ["palette", "tags", "styleLabel", "searchTerms"]
} as const;

export interface GeminiVibe {
  palette: string[];
  tags: string[];
  materials: string[];
  styleLabel: string;
  searchTerms: string[];
  note: string;
}

const VIBE_PROMPT = `You are an interior design editor reading inspiration images.

Return:
- "palette": 4-5 hex colors that define the look, most dominant first.
- "tags": 3-5 single-word mood descriptors chosen from this list where they fit: warm, cool, quiet, calm, spare, moody, intimate, bright, breezy, airy, layered, collected, earthy, minimal, restrained, editorial, grounded, rich, soft, functional.
- "materials": the visible materials, e.g. oak, bouclé, brass, travertine, linen, rattan.
- "styleLabel": a two-or-three word name for the style, e.g. "Warm Minimal", "Moody Classic".
- "searchTerms": 4-6 shopping queries that would surface furniture in this exact look. Write them the way a person searches a retailer, e.g. "low profile oak coffee table" or "cream boucle accent chair". No brand names.
- "note": one sentence on what makes this look work.`;

export async function readVibe(images: InlineImage[]): Promise<GeminiVibe> {
  const json = await callGemini({ prompt: VIBE_PROMPT, images, schema: VIBE_SCHEMA });
  return {
    palette: (json.palette || []).filter(isHex).slice(0, 5),
    tags: (json.tags || []).map((t: any) => String(t).toLowerCase()).slice(0, 5),
    materials: (json.materials || []).map(String).slice(0, 6),
    styleLabel: String(json.styleLabel || "Warm Minimal"),
    searchTerms: (json.searchTerms || []).map(String).slice(0, 6),
    note: String(json.note || "")
  };
}

/* ---------- reading one inspiration image as a shoppable room ---------- */

const LOOK_SCHEMA = {
  type: "object",
  properties: {
    palette: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    materials: { type: "array", items: { type: "string" } },
    styleLabel: { type: "string" },
    searchTerms: { type: "array", items: { type: "string" } },
    note: { type: "string" },
    widthFt: { type: "number" },
    depthFt: { type: "number" },
    wallColor: { type: "string" },
    floorColor: { type: "string" },
    openings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["door", "window"] },
          wall: { type: "string", enum: ["N", "S", "E", "W"] },
          positionFt: { type: "number" },
          widthFt: { type: "number" }
        },
        required: ["kind", "wall", "positionFt", "widthFt"]
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          searchTerm: { type: "string" },
          color: { type: "string" },
          material: { type: "string" },
          widthFt: { type: "number" },
          depthFt: { type: "number" },
          x: { type: "number" },
          y: { type: "number" },
          backsTo: { type: "string", enum: ["N", "E", "S", "W", "none"] }
        },
        required: ["category", "label", "searchTerm"]
      }
    }
  },
  required: ["palette", "tags", "styleLabel", "items"]
} as const;

export interface LookItem {
  category: Category;
  /** What this piece is, in the picture: "dark green metal frame queen bed". */
  label: string;
  /** The query that would surface this exact piece at a retailer. */
  searchTerm: string;
  /** The piece's own colour and material, folded into its query. */
  color?: string;
  material?: string;
  widthFt?: number;
  depthFt?: number;
  /** Where it stands in the picture's own floor plan, in feet. */
  x?: number;
  y?: number;
  /** The wall its back is against, or "none" if it stands free. */
  backsTo?: "N" | "E" | "S" | "W" | "none";
}

export interface GeminiLook extends GeminiVibe {
  widthFt: number;
  depthFt: number;
  /** Read straight off the picture, rather than guessed from the palette. */
  wallColor?: string;
  floorColor?: string;
  openings: Opening[];
  items: LookItem[];
}

/** Eight is already a full room; beyond that the plan stops resembling the photo. */
const MAX_ITEMS = 8;

const LOOK_PROMPT = `You are an interior design editor and spatial analyst reading ONE inspiration photograph of a room.

Return the look AND an inventory of what is actually in the picture.

"items" is the important part. Rules:
- One entry per DISTINCT piece of furniture you can actually see. If the photo shows a bed, one chair and a plant, return exactly three items — not a catalogue of what a bedroom usually has.
- Do NOT invent pieces that are not visible. Do NOT pad the list. Fewer, accurate items is the correct answer.
- Count duplicates separately only when they are clearly a pair, e.g. two matching nightstands.
- "category" must be one of: sofa, chair, table, bed, rug, lamp, shelf, plant, art, desk, dresser, nightstand, mirror, tv.
- "label" describes the piece as seen, e.g. "black metal frame queen bed with white linen".
- "searchTerm" is how a person would search a retailer for THAT piece. Lead with its colour and material, because that is what makes a result look like the picture: "black metal articulated task lamp", not "table lamp". No brand names.
- "color" is the piece's dominant colour in one or two plain words, e.g. "black", "warm oak", "olive green".
- "material" is what it is made of, e.g. "powder-coated metal", "oak", "boucle".
- "widthFt"/"depthFt" are its rough footprint in feet.
- "x"/"y" are where the piece's CENTRE sits on the floor plan, in feet, in the same plan as widthFt/depthFt below: origin (0,0) is the top-left corner seen from above, x runs along the width, y along the depth. Read the perspective of the photograph and place each piece where it actually stands in the room.
- "backsTo" is the wall the piece has its back against — N is y=0, S is y=depth, W is x=0, E is x=width — or "none" if it stands free of the walls.
- Skip small decor: books, cushions, vases, candles, picture frames smaller than a laptop.
- At most ${MAX_ITEMS} items.

Also return the room shell so a floor plan can be rebuilt from it:
- "wallColor": the dominant WALL colour as a hex string, read off the picture. A green feature wall is green here, not the colour of the trim.
- "floorColor": the FLOOR colour as a hex string.
- "widthFt"/"depthFt": the room's approximate footprint in FEET. Set scale from an interior door (about 2.6-3 ft wide, 6.7 ft tall) or a queen bed (5 x 6.7 ft).
- "openings": doors and windows you can see. Wall N is y=0, S is y=depth, W is x=0, E is x=width. "positionFt" is the distance along that wall to the opening's near edge. An empty array is valid — do not invent openings.

And the look itself:
- "palette": 4-5 hex colors, most dominant first.
- "tags": 3-5 single-word moods from: warm, cool, quiet, calm, spare, moody, intimate, bright, breezy, airy, layered, collected, earthy, minimal, restrained, editorial, grounded, rich, soft, functional.
- "materials": visible materials, e.g. oak, bouclé, brass, travertine, linen.
- "styleLabel": two or three words, e.g. "Warm Minimal".
- "searchTerms": 4-6 shopping queries for the overall look.
- "note": one sentence on what makes it work.`;

/**
 * Reads an inspiration image into a shoppable room: the look, the pieces that
 * are genuinely in the picture, and the shell they sit in.
 *
 * This exists because searching a fixed category mix per room type returned a
 * catalogue — two dozen pieces for a photo containing four — and a plan built
 * from that could not resemble the photo. Shopping the actual inventory keeps
 * the count honest.
 */
export async function readLook(images: InlineImage[]): Promise<GeminiLook> {
  return normalizeLook(await callGemini({ prompt: LOOK_PROMPT, images, schema: LOOK_SCHEMA }));
}

export { LOOK_PROMPT };

/**
 * Turns whatever a vision model hands back into a GeminiLook we can trust.
 *
 * Kept apart from the transport because more than one provider produces this
 * shape now, and the clamping is the part that must not diverge between them:
 * a position outside the room or a category we don't model breaks the layout
 * engine, not the prompt.
 */
export function normalizeLook(json: any): GeminiLook {
  const widthFt = clamp(num(json.widthFt, 13), 5, 40);
  const depthFt = clamp(num(json.depthFt, 12), 5, 40);

  const openings: Opening[] = (json.openings || [])
    .filter((o: any) => o?.kind && o?.wall)
    .map((o: any) => ({
      kind: o.kind === "door" ? "door" : "window",
      wall: (["N", "S", "E", "W"].includes(o.wall) ? o.wall : "N") as Opening["wall"],
      positionFt: clamp(num(o.positionFt), 0, 40),
      widthFt: clamp(num(o.widthFt, 3), 0.5, 12),
      swingFt: o.kind === "door" ? 3.2 : undefined
    }));

  const items: LookItem[] = (json.items || [])
    .filter((i: any) => i?.category && i?.searchTerm)
    .slice(0, MAX_ITEMS)
    .map((i: any) => ({
      category: normalizeCategory(i.category),
      label: String(i.label || i.category).slice(0, 120),
      searchTerm: String(i.searchTerm).slice(0, 80),
      color: i.color ? String(i.color).slice(0, 40) : undefined,
      material: i.material ? String(i.material).slice(0, 40) : undefined,
      widthFt: i.widthFt ? clamp(num(i.widthFt), 0.2, 20) : undefined,
      depthFt: i.depthFt ? clamp(num(i.depthFt), 0.2, 20) : undefined,
      x: i.x != null ? clamp(num(i.x), 0, widthFt) : undefined,
      y: i.y != null ? clamp(num(i.y), 0, depthFt) : undefined,
      backsTo: ["N", "E", "S", "W", "none"].includes(i.backsTo) ? i.backsTo : undefined
    }));

  return {
    palette: (json.palette || []).filter(isHex).slice(0, 5),
    tags: (json.tags || []).map((t: any) => String(t).toLowerCase()).slice(0, 5),
    materials: (json.materials || []).map(String).slice(0, 6),
    styleLabel: String(json.styleLabel || "Warm Minimal"),
    searchTerms: (json.searchTerms || []).map(String).slice(0, 6),
    note: String(json.note || ""),
    widthFt,
    depthFt,
    wallColor: isHex(json.wallColor) ? json.wallColor : undefined,
    floorColor: isHex(json.floorColor) ? json.floorColor : undefined,
    openings,
    items
  };
}

/* ---------- transport ---------- */

async function callGemini({ prompt, images, schema }: { prompt: string; images: InlineImage[]; schema: unknown }): Promise<any> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not set");

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        ...images.map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.data } }))
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 400)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("");
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

/* ---------- guards ---------- */

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
}

const CATEGORY_ALIASES: Record<string, Category> = {
  couch: "sofa", sectional: "sofa", loveseat: "sofa",
  bookshelf: "shelf", bookcase: "shelf", shelving: "shelf", storage: "shelf",
  "coffee table": "table", "side table": "table", "dining table": "table", console: "table",
  "bedside table": "nightstand", "night stand": "nightstand",
  wardrobe: "dresser", armoire: "dresser", "chest of drawers": "dresser",
  armchair: "chair", stool: "chair", bench: "chair", ottoman: "chair",
  rug: "rug", carpet: "rug", lamp: "lamp", plant: "plant", mirror: "mirror", desk: "desk", bed: "bed", art: "art"
};

function normalizeCategory(raw: string): Category {
  const k = String(raw).toLowerCase().trim();
  if (CATEGORY_ALIASES[k]) return CATEGORY_ALIASES[k];
  const known: Category[] = ["sofa", "chair", "table", "bed", "rug", "lamp", "shelf", "plant", "art", "desk", "dresser", "nightstand", "mirror"];
  return known.find((c) => k.includes(c)) || "table";
}
