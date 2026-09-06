import { NextResponse } from "next/server";

/**
 * Photoreal render pass.
 *
 * The 3D view already knows the room's dimensions and where every piece sits.
 * This hands that layout to Gemini together with the listing photos themselves,
 * so the room comes back containing the exact products the shopper picked
 * rather than a model's idea of "a sofa".
 *
 * Set GEMINI_API_KEY to enable. GEMINI_IMAGE_MODEL overrides the model and
 * GEMINI_API_BASE the host, for a proxy or a self-hosted gateway.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const ENDPOINT = `${BASE}/v1beta/models/${MODEL}:generateContent`;
const MAX_REFERENCE_IMAGES = 6;
const MAX_IMAGE_BYTES = 4_000_000;

interface Piece {
  title: string;
  category: string;
  source?: string;
  image?: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
}

interface Body {
  widthFt: number;
  depthFt: number;
  style?: string;
  roomType?: string;
  palette?: string[];
  lightingNote?: string;
  pieces: Piece[];
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

const ROOM_NOUN: Record<string, string> = {
  living: "living room",
  bedroom: "bedroom",
  office: "home office",
  studio: "studio apartment"
};

/** Where a piece sits, in words a renderer can act on. */
function describe(p: Piece, room: Body) {
  const across = p.x < room.widthFt / 3 ? "left" : p.x > (room.widthFt * 2) / 3 ? "right" : "center";
  const into = p.y < room.depthFt / 3 ? "far" : p.y > (room.depthFt * 2) / 3 ? "near" : "middle";
  return [
    `- ${p.title} (${p.category})`,
    `${p.width.toFixed(1)}ft wide x ${p.depth.toFixed(1)}ft deep x ${p.height.toFixed(1)}ft tall`,
    `placed ${p.x.toFixed(1)}ft from the left wall and ${p.y.toFixed(1)}ft from the far wall`,
    `(${into} ${across} of the room), rotated ${Math.round(p.rotation)} degrees`
  ].join(", ");
}

async function fetchImage(url: string): Promise<Part | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { inlineData: { mimeType: type.split(";")[0], data: Buffer.from(buf).toString("base64") } };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Photoreal rendering needs a Gemini API key. Set GEMINI_API_KEY in the environment (free tier at aistudio.google.com), then try again." },
      { status: 501 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!body?.pieces?.length) {
    return NextResponse.json({ error: "Nothing placed in the room yet." }, { status: 400 });
  }

  const withPhotos = body.pieces.filter((p) => p.image).slice(0, MAX_REFERENCE_IMAGES);
  const references = await Promise.all(withPhotos.map((p) => fetchImage(p.image as string)));

  const prompt = [
    `Photorealistic interior photograph of a ${body.style?.replace("-", " ") || "warm minimal"} ${ROOM_NOUN[body.roomType || ""] || "room"}.`,
    `The room measures exactly ${body.widthFt.toFixed(1)} feet wide by ${body.depthFt.toFixed(1)} feet deep with 9 foot ceilings.`,
    "",
    "Furnish it with exactly these pieces, at these positions and at this scale, and nothing else:",
    ...body.pieces.map((p) => describe(p, body)),
    "",
    "The reference images that follow are the actual products. Reproduce each one exactly:",
    "same shape, same upholstery or wood, same color, same proportions. Do not substitute a",
    "similar-looking piece, do not restyle them, and do not add furniture that is not listed.",
    body.palette?.length ? `Keep the room's palette close to ${body.palette.join(", ")}.` : "",
    body.lightingNote ? `Lighting: ${body.lightingNote}` : "Natural daylight from one window, warm and even.",
    "",
    "Shoot it like an interiors magazine: eye-level camera in a corner showing two walls,",
    "wide lens, natural light, soft shadows, wood floor, no people, no text, no watermarks."
  ]
    .filter(Boolean)
    .join("\n");

  const parts: Part[] = [{ text: prompt }];
  withPhotos.forEach((p, i) => {
    const ref = references[i];
    if (!ref) return;
    parts.push({ text: `Reference product — ${p.title}:` });
    parts.push(ref);
  });

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
      }),
      signal: AbortSignal.timeout(55000)
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json?.error?.message || `Gemini returned ${res.status}.`, model: MODEL }, { status: 502 });
    }

    const out = (json?.candidates?.[0]?.content?.parts || []) as any[];
    const image = out.find((p) => p?.inlineData?.data || p?.inline_data?.data);
    if (!image) {
      const text = out.find((p) => p?.text)?.text;
      return NextResponse.json({ error: text || "Gemini returned no image.", model: MODEL }, { status: 502 });
    }
    const inline = image.inlineData || image.inline_data;
    return NextResponse.json({
      image: `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`,
      model: MODEL,
      referenced: references.filter(Boolean).length
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Render failed.", model: MODEL }, { status: 502 });
  }
}
