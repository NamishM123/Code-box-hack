import { NextResponse } from "next/server";

/**
 * Photoreal render pass.
 *
 * The 3D view already knows the room's dimensions and where every piece sits.
 * This hands that layout to Gemini together with the listing photos themselves,
 * so the room comes back containing the exact products the shopper picked
 * rather than a model's idea of "a sofa".
 *
 * Set OPENAI_API_KEY or a Google key to enable. GOOGLE_AI_API_KEY is the name
 * the rest of this app already uses for Google, so it is the one to set;
 * GEMINI_API_KEY is accepted as an alias. GEMINI_IMAGE_MODEL and
 * GEMINI_API_BASE override the model and host.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Leave a couple of seconds under maxDuration so the request is cut off here,
 * with an explanation, rather than by the platform with a blank 504.
 */
const CALL_TIMEOUT_MS = 55_000;

const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const GEMINI_BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
const OPENAI_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/$/, "");
const MAX_REFERENCE_IMAGES = 6;
const MAX_IMAGE_BYTES = 4_000_000;

/**
 * The Google key, under whichever name it was set. GOOGLE_AI_API_KEY is what
 * the capture flow and the live catalog already read, so a key set for those
 * has to work here too rather than silently reporting no key at all.
 */
function googleKey() {
  return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
}

/**
 * Which image model renders the room. Set RENDER_PROVIDER to pin one;
 * otherwise whichever key is configured wins, OpenAI first.
 */
function chooseProvider(): "openai" | "gemini" | null {
  const pinned = process.env.RENDER_PROVIDER?.toLowerCase();
  if (pinned === "openai") return process.env.OPENAI_API_KEY ? "openai" : null;
  if (pinned === "gemini") return googleKey() ? "gemini" : null;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (googleKey()) return "gemini";
  return null;
}

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
  /** A data URL of the current 3D view, used as the layout to match. */
  layoutImage?: string;
  /** Fast trades rendering quality for a much shorter wait. */
  speed?: "fast" | "best";
  /** Stream partial images back as they form, rather than waiting for the last one. */
  stream?: boolean;
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

interface Reference {
  label: string;
  mimeType: string;
  bytes: Buffer;
}

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

async function fetchImage(url: string, origin: string, label: string): Promise<Reference | null> {
  try {
    // Verified product shots are served from this app, so their URLs are
    // relative and have to be resolved before the server can fetch them.
    const absolute = new URL(url, origin).toString();
    const res = await fetch(absolute, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    return { label, mimeType: type.split(";")[0], bytes: Buffer.from(buf) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const provider = chooseProvider();
  if (!provider) {
    return NextResponse.json(
      {
        // Name every variable checked: the last time this fired, the key was
        // set under a name this route did not look at.
        error:
          "No image key found. This looked for OPENAI_API_KEY, GOOGLE_AI_API_KEY and GEMINI_API_KEY and found none of them set. Add one in the environment and redeploy. RENDER_PROVIDER=openai|gemini pins which is used.",
        checked: ["OPENAI_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY"]
      },
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

  const started = Date.now();
  const origin = new URL(req.url).origin;

  // The pieces the shopper actually chose, as photographs. This is the whole
  // point: the room has to come back containing those products, so they go in
  // as pictures rather than as adjectives.
  const withPhotos = body.pieces.filter((p) => p.image).slice(0, MAX_REFERENCE_IMAGES);
  const references = (await Promise.all(withPhotos.map((p) => fetchImage(p.image as string, origin, p.title)))).filter(
    Boolean
  ) as Reference[];

  const frame = body.layoutImage?.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  const layout: Reference | null = frame ? { label: "layout", mimeType: frame[1], bytes: Buffer.from(frame[2], "base64") } : null;

  const prompt = buildPrompt(body, references, Boolean(layout));

  const gathered = Date.now();

  // Streaming does not make the model finish sooner; it makes the wait visible.
  // A recognisable image appears in a few seconds and sharpens, instead of a
  // spinner sitting on nothing for half a minute.
  if (body.stream && provider === "openai") {
    return streamFromOpenAI(prompt, layout, references, body.speed !== "best", started, gathered);
  }

  try {
    const callStarted = Date.now();
    const image =
      provider === "openai"
        ? await renderWithOpenAI(prompt, layout, references, body.speed !== "best")
        : await renderWithGemini(prompt, layout, references);
    return NextResponse.json({
      image,
      provider,
      model: provider === "openai" ? OPENAI_MODEL : GEMINI_MODEL,
      referenced: references.length,
      usedLayoutFrame: Boolean(layout),
      speed: body.speed === "best" ? "best" : "fast",
      // split out, so a slow render can be blamed on the right half
      referenceMs: gathered - started,
      providerMs: Date.now() - callStarted,
      ms: Date.now() - started
    });
  } catch (err) {
    // A timeout is the one failure with an obvious remedy, so it says what it is.
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || /abort|timeout/i.test(err.message));
    return NextResponse.json(
      {
        error: timedOut
          ? `${provider} did not return an image within ${CALL_TIMEOUT_MS / 1000}s, which is the ceiling this function runs under. Lower OPENAI_IMAGE_QUALITY to medium, drop OPENAI_IMAGE_SIZE to 1024x1024, or set RENDER_PROVIDER=gemini, which is built for speed.`
          : err instanceof Error
            ? err.message
            : "Render failed.",
        timedOut,
        provider,
        model: provider === "openai" ? OPENAI_MODEL : GEMINI_MODEL,
        ms: Date.now() - started
      },
      { status: 502 }
    );
  }
}

function buildPrompt(body: Body, references: Reference[], hasLayout: boolean) {
  return [
    `A photograph of a ${body.style?.replace("-", " ") || "warm minimal"} ${ROOM_NOUN[body.roomType || ""] || "room"}.`,
    `The room is ${body.widthFt.toFixed(1)} feet wide by ${body.depthFt.toFixed(1)} feet deep with 9 foot ceilings.`,
    "",
    "It contains exactly these pieces, at these positions and at this scale, and nothing else:",
    ...body.pieces.map((p) => describe(p, body)),
    "",
    references.length
      ? `The product photographs supplied are the actual pieces (${references
          .map((r) => r.label)
          .join("; ")}). Reproduce each one exactly: same shape, same upholstery or wood, same colour, same proportions. Do not substitute a similar-looking piece and do not add furniture that is not listed.`
      : "",
    hasLayout
      ? "One supplied image is a 3D view of this exact room, to scale. Match it: same camera, same room proportions, same piece in the same place at the same size, facing the same way. Keep that geometry and replace the rendering with a photograph."
      : "",
    body.palette?.length ? `Keep the room's palette close to ${body.palette.join(", ")}.` : "",
    body.lightingNote ? `Lighting: ${body.lightingNote}` : "Natural daylight from one window, warm and even.",
    "",
    "It must read as a photograph taken in a real home, not as a render: real fabric weave and wood grain,",
    "soft contact shadows under every piece, slight depth of field, natural imperfection. No CGI sheen, no",
    "plastic surfaces, no people, no text, no watermarks."
  ]
    .filter(Boolean)
    .join("\n");
}

function openaiForm(prompt: string, layout: Reference | null, references: Reference[], fast: boolean) {
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
  form.append("size", process.env.OPENAI_IMAGE_SIZE || (fast ? "1024x1024" : "1536x1024"));
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || (fast ? "medium" : "high"));

  const files = [layout, ...references].filter(Boolean) as Reference[];
  if (!files.length) throw new Error("Nothing to render from: no layout frame and no product photos.");
  files.forEach((ref, i) => {
    const ext = ref.mimeType.includes("png") ? "png" : ref.mimeType.includes("webp") ? "webp" : "jpg";
    form.append("image[]", new Blob([new Uint8Array(ref.bytes)], { type: ref.mimeType }), `${i === 0 && layout ? "layout" : "product"}-${i}.${ext}`);
  });
  return form;
}

/**
 * Relays OpenAI's partial images straight through to the browser as they
 * arrive, so the view can show the picture forming.
 */
function streamFromOpenAI(
  prompt: string,
  layout: Reference | null,
  references: Reference[],
  fast: boolean,
  started: number,
  gathered: number
) {
  const form = openaiForm(prompt, layout, references, fast);
  form.append("stream", "true");
  form.append("partial_images", "2");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const res = await fetch(`${OPENAI_BASE}/v1/images/edits`, {
          method: "POST",
          headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: form,
          signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
        });
        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          send({ type: "error", error: detail.slice(0, 400) || `OpenAI returned ${res.status}.` });
          return controller.close();
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let partials = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const block of events) {
            const line = block.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            let event: any;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }
            const b64 = event?.b64_json || event?.data?.[0]?.b64_json;
            if (!b64) continue;
            const final = typeof event?.type === "string" && event.type.endsWith(".completed");
            if (!final) partials++;
            send({
              type: final ? "done" : "partial",
              image: `data:image/png;base64,${b64}`,
              provider: "openai",
              model: OPENAI_MODEL,
              partials,
              referenceMs: gathered - started,
              ms: Date.now() - started
            });
          }
        }
        controller.close();
      } catch (err) {
        const timedOut = err instanceof Error && (err.name === "TimeoutError" || /abort|timeout/i.test(err.message));
        send({
          type: "error",
          error: timedOut
            ? `openai did not return an image within ${CALL_TIMEOUT_MS / 1000}s. Lower OPENAI_IMAGE_QUALITY, drop OPENAI_IMAGE_SIZE, or set RENDER_PROVIDER=gemini.`
            : err instanceof Error
              ? err.message
              : "Render failed."
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" }
  });
}

/** Google: everything goes in one multimodal request. */
async function renderWithGemini(prompt: string, layout: Reference | null, references: Reference[]) {
  const key = googleKey();
  const parts: Part[] = [{ text: prompt }];
  if (layout) {
    parts.push({ text: "The 3D view of the room to match:" });
    parts.push({ inlineData: { mimeType: layout.mimeType, data: layout.bytes.toString("base64") } });
  }
  for (const ref of references) {
    parts.push({ text: `The actual product — ${ref.label}:` });
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.bytes.toString("base64") } });
  }

  const res = await fetch(`${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Gemini returned ${res.status}.`);

  const out = (json?.candidates?.[0]?.content?.parts || []) as any[];
  const hit = out.find((p) => p?.inlineData?.data || p?.inline_data?.data);
  if (!hit) throw new Error(out.find((p) => p?.text)?.text || "Gemini returned no image.");
  const inline = hit.inlineData || hit.inline_data;
  return `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`;
}

/**
 * OpenAI: the image edit endpoint takes the references as uploaded files, the
 * layout frame first so it is the one being edited into a photograph.
 */
async function renderWithOpenAI(prompt: string, layout: Reference | null, references: Reference[], fast: boolean) {
  const key = process.env.OPENAI_API_KEY as string;
  const form = new FormData();
  form.append("model", OPENAI_MODEL);
  form.append("prompt", prompt);
  // A room is a landscape subject, and this is the deliverable rather than a
  // thumbnail, so ask for the wide frame at the top quality tier.
  // Quality and pixel count are what a GPT image call spends its time on, so
  // this is the dial that actually moves the wait. Env vars still win, for
  // pinning a deployment to one setting.
  form.append("size", process.env.OPENAI_IMAGE_SIZE || (fast ? "1024x1024" : "1536x1024"));
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || (fast ? "medium" : "high"));

  const files = [layout, ...references].filter(Boolean) as Reference[];
  if (!files.length) throw new Error("Nothing to render from: no layout frame and no product photos.");
  files.forEach((ref, i) => {
    const ext = ref.mimeType.includes("png") ? "png" : ref.mimeType.includes("webp") ? "webp" : "jpg";
    form.append("image[]", new Blob([new Uint8Array(ref.bytes)], { type: ref.mimeType }), `${i === 0 && layout ? "layout" : "product"}-${i}.${ext}`);
  });

  const res = await fetch(`${OPENAI_BASE}/v1/images/edits`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI returned ${res.status}.`);
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image.");
  return `data:image/png;base64,${b64}`;
}
