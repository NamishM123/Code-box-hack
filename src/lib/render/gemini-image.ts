/**
 * Gemini 2.5 Flash Image ("Nano Banana") render adapter.
 *
 * Its strength here is compositing: hand it the real product photos and it
 * places those pieces into a generated room rather than inventing generic
 * furniture. That is what makes the render worth showing next to a shopping
 * list — the sofa in the picture is the sofa in the cart.
 */

const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface RefImage { mimeType: string; data: string }

export interface RenderResult { mimeType: string; data: string; note?: string }

export function hasImageModel() {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}

export async function renderRoom(prompt: string, refs: RefImage[]): Promise<RenderResult> {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_API_KEY is not set");

  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        ...refs.map((r) => ({ inline_data: { mime_type: r.mimeType, data: r.data } }))
      ]
    }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      temperature: 0.7
    }
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini image ${res.status}: ${detail.slice(0, 400)}`);
  }

  const json = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];

  const image = parts.find((p) => p.inlineData || p.inline_data);
  if (!image) {
    const text = parts.map((p) => p.text).filter(Boolean).join(" ");
    const blocked = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason;
    throw new Error(text || `No image returned${blocked ? ` (${blocked})` : ""}`);
  }

  const inline = image.inlineData || image.inline_data;
  return {
    mimeType: inline.mimeType || inline.mime_type || "image/png",
    data: inline.data,
    note: parts.map((p) => p.text).filter(Boolean).join(" ") || undefined
  };
}

/** Download a product photo for use as a compositing reference. */
export async function fetchReference(url: string, maxBytes = 3 * 1024 * 1024): Promise<RefImage | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; SightlineBot/1.0)" },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) return null;
    return { mimeType: type, data: buf.toString("base64") };
  } catch {
    return null;
  }
}
