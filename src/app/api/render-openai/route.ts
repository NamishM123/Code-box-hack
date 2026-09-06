import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RenderRequestItem {
  productId: string;
  imageUrl: string;
  category: string;
  title: string;
  color: string;
  material?: string;
  widthFt: number;
  depthFt: number;
  heightFt: number;
  x: number;
  y: number;
  rotation: number;
}

interface RenderRequestBody {
  roomPhoto: string;
  roomWidthFt: number;
  roomDepthFt: number;
  style: string;
  vibeTags?: string[];
  lightingNote?: string;
  items: RenderRequestItem[];
  n?: number;
}

function describePosition(x: number, y: number, rotationDeg: number, W: number, D: number): string {
  const hZone = x / W < 0.33 ? "west" : x / W > 0.67 ? "east" : "center";
  const vZone = y / D < 0.33 ? "north" : y / D > 0.67 ? "south" : "center";

  let zone: string;
  if (hZone === "center" && vZone === "center") zone = "in the center of the room";
  else if (hZone === "center") zone = `along the ${vZone} wall, centered horizontally`;
  else if (vZone === "center") zone = `along the ${hZone} wall, centered front-to-back`;
  else zone = `in the ${vZone}-${hZone} corner area`;

  const facing = rotationDeg === 0 ? "" : `, rotated about ${Math.round(rotationDeg)} degrees from facing the viewer`;
  return `${zone}${facing}`;
}

function buildRenderPrompt(body: RenderRequestBody): string {
  const itemLines = body.items
    .map((item, i) => {
      const pos = describePosition(item.x, item.y, item.rotation, body.roomWidthFt, body.roomDepthFt);
      const desc = `${item.color} ${item.material ? item.material + " " : ""}${item.category}`;
      return `${i + 1}. Reference image ${i + 2}: a ${desc} ("${item.title}"). Place it ${pos}.`;
    })
    .join("\n");

  return [
    "The first image is a photo of a real room. Each subsequent reference image shows one real furniture piece that must appear in the output, exactly as photographed.",
    "",
    "Generate a single new, photorealistic photo of the SAME room — same architecture, walls, windows, floor, ceiling, and camera framing as the first image — furnished with EXACTLY the following pieces, in EXACTLY this arrangement (do not redesign or optimize the layout; reproduce it as specified):",
    "",
    itemLines,
    "",
    `Room dimensions: approximately ${body.roomWidthFt.toFixed(1)} ft wide by ${body.roomDepthFt.toFixed(1)} ft deep.`,
    body.lightingNote ? `Lighting: ${body.lightingNote}` : "",
    body.style ? `Overall style to preserve in finish and styling only (not furniture selection): ${body.style.replace("-", " ")}.` : "",
    body.vibeTags?.length ? `Mood: ${body.vibeTags.join(", ")}.` : "",
    "",
    "Hard constraints:",
    "- Do not add, invent, or substitute any furniture, decor, or object that is not one of the numbered reference images above. Nothing extra, nothing missing.",
    "- Do not alter the material, texture, color, proportions, or shape of any referenced piece — reproduce each item exactly as shown in its reference photo.",
    "- Do not change the position or rotation described for each item; the layout above is final, not a suggestion.",
    "- The final image must look like a real, unedited photograph: correct scale, no distorted proportions, no warped geometry, no physically implausible placement, consistent perspective and lighting with the original room photo."
  ]
    .filter(Boolean)
    .join("\n");
}

async function callOpenAIEdit(args: {
  roomBuf: Buffer;
  roomContentType: string;
  refs: { item: RenderRequestItem; buf: Buffer; contentType: string }[];
  prompt: string;
  apiKey: string;
}): Promise<string> {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", args.prompt);
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("n", "1");
  form.append("image[]", new Blob([args.roomBuf], { type: args.roomContentType }), "room.jpg");
  for (const r of args.refs) {
    form.append("image[]", new Blob([r.buf], { type: r.contentType }), `${r.item.productId}.jpg`);
  }
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}` },
    body: form
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI error ${res.status}`);
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image in OpenAI response");
  return `data:image/png;base64,${b64}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RenderRequestBody;

    if (!body.roomPhoto?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Missing room photo" }, { status: 400 });
    }
    if (!body.items?.length) {
      return NextResponse.json({ error: "No furniture to render" }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Render service is not configured" }, { status: 500 });
    }

    const fetched = await Promise.allSettled(
      body.items.map(async (item) => {
        // Demo/seed catalog entries can use paths relative to this app's own
        // public/ folder (e.g. "/demo-products/linen-sofa.png"); resolve those
        // against the incoming request's origin so the server-side fetch works.
        const resolvedUrl = new URL(item.imageUrl, req.url).toString();
        const res = await fetch(resolvedUrl);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return { item, buf, contentType };
      })
    );

    const failedIds = body.items
      .filter((_, i) => fetched[i].status === "rejected")
      .map((item) => item.productId);

    if (failedIds.length > 0) {
      return NextResponse.json(
        { error: "Could not fetch reference images for some furniture", failedProductIds: failedIds },
        { status: 502 }
      );
    }

    const refs = fetched.map(
      (r) => (r as PromiseFulfilledResult<{ item: RenderRequestItem; buf: Buffer; contentType: string }>).value
    );

    const match = body.roomPhoto.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: "Malformed room photo" }, { status: 400 });
    const roomBuf = Buffer.from(match[2], "base64");
    const roomContentType = match[1];

    const prompt = buildRenderPrompt(body);
    const n = Math.min(Math.max(body.n ?? 3, 1), 3);

    const results = await Promise.allSettled(
      Array.from({ length: n }, () => callOpenAIEdit({ roomBuf, roomContentType, refs, prompt, apiKey }))
    );

    const images = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    if (!images.length) {
      return NextResponse.json({ error: "Render failed" }, { status: 502 });
    }

    return NextResponse.json({ images, requested: n, succeeded: images.length });
  } catch {
    return NextResponse.json({ error: "Unexpected render failure" }, { status: 500 });
  }
}
