import { NextResponse } from "next/server";
import { buildRenderPrompt, type Camera } from "@/lib/render/describe";
import { fetchReference, hasImageModel, renderRoom, type RefImage } from "@/lib/render/gemini-image";
import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Pieces that dominate the frame. Too many references dilutes the composite. */
const REFERENCE_PRIORITY = ["sofa", "bed", "desk", "chair", "table", "shelf", "dresser", "rug"];
const MAX_REFS = 4;

export async function POST(req: Request) {
  if (!hasImageModel()) {
    return NextResponse.json(
      { error: "no_key", message: "Set GOOGLE_AI_API_KEY to render the room." },
      { status: 501 }
    );
  }

  const body = (await req.json()) as {
    room: RoomSpec;
    detected?: DetectedRoom | null;
    placed: PlacedItem[];
    products: Product[];
    camera?: Camera;
    useProductPhotos?: boolean;
  };

  if (!body?.room || !Array.isArray(body.placed) || !Array.isArray(body.products)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const camera: Camera = body.camera || "dollhouse";
  const byId = Object.fromEntries(body.products.map((p) => [p.id, p]));

  // Order the plan so the reference images line up with the prompt's list.
  const ordered = [...body.placed].sort((a, b) => {
    const pa = REFERENCE_PRIORITY.indexOf(byId[a.productId]?.category || "");
    const pb = REFERENCE_PRIORITY.indexOf(byId[b.productId]?.category || "");
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
  });

  let refs: RefImage[] = [];
  if (body.useProductPhotos !== false) {
    const candidates = ordered
      .map((p) => byId[p.productId])
      .filter((p): p is Product => Boolean(p?.image))
      .filter((p) => REFERENCE_PRIORITY.includes(p.category))
      .slice(0, MAX_REFS);

    const settled = await Promise.all(candidates.map((p) => fetchReference(p.image)));
    refs = settled.filter((r): r is RefImage => r !== null);
  }

  const prompt = buildRenderPrompt({
    room: body.room,
    detected: body.detected,
    placed: ordered,
    products: body.products,
    camera,
    referenceCount: refs.length
  });

  try {
    const result = await renderRoom(prompt, refs);
    return NextResponse.json({
      image: `data:${result.mimeType};base64,${result.data}`,
      camera,
      referenceCount: refs.length,
      note: result.note
    });
  } catch (e) {
    return NextResponse.json(
      { error: "render_failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
