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
