import {
  LOOK_PROMPT,
  hasGemini,
  normalizeLook,
  readLook as readLookGemini,
  type GeminiLook,
  type InlineImage
} from "./gemini";

/**
 * Reading an inspiration picture, whichever vision model is configured.
 *
 * This exists because the repo talks to OpenAI for image *generation* only —
 * /v1/images/edits — and had no OpenAI path for reading an image at all. So a
 * deployment that moved off Google had no reader, /api/pinterest returned no
 * vibe, and the shop quietly fell back to searching the words "table lamp".
 *
 * Both providers answer the same prompt and go through the same normalizeLook,
 * so the layout engine can't tell which one ran.
 */

const OPENAI_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/$/, "");
const OPENAI_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
const TIMEOUT_MS = 45_000;

export type VisionProvider = "openai" | "gemini";

/** VISION_PROVIDER pins one; otherwise OpenAI wins when both keys are present. */
export function visionProvider(): VisionProvider | null {
  const pinned = process.env.VISION_PROVIDER?.toLowerCase();
  if (pinned === "openai") return process.env.OPENAI_API_KEY ? "openai" : null;
  if (pinned === "gemini") return hasGemini() ? "gemini" : null;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (hasGemini()) return "gemini";
  return null;
}

export function hasVision() {
  return visionProvider() !== null;
}

/** Names the keys that were looked for, so a failure can say what's missing. */
export const VISION_KEYS = ["OPENAI_API_KEY", "GOOGLE_AI_API_KEY"];

export async function readLook(images: InlineImage[]): Promise<GeminiLook> {
  const provider = visionProvider();
  if (provider === "openai") return readLookOpenAI(images);
  if (provider === "gemini") return readLookGemini(images);
  throw new Error(`No vision key found. Looked for ${VISION_KEYS.join(" and ")}.`);
}

/**
 * OpenAI chat completions with the picture inline.
 *
 * json_object rather than a strict json_schema: strict mode demands every
 * property be required and additionalProperties be false throughout, which a
 * nested optional shape like this fails on, and normalizeLook is already
 * tolerant of a missing or malformed field. Robustness beats a schema that
 * rejects the whole answer over one absent key.
 */
async function readLookOpenAI(images: InlineImage[]): Promise<GeminiLook> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OPENAI_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${LOOK_PROMPT}\n\nReply with JSON only.` },
              ...images.map((img) => ({
                type: "image_url" as const,
                image_url: { url: `data:${img.mimeType};base64,${img.data}` }
              }))
            ]
          }
        ]
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI returned no content");

    return normalizeLook(JSON.parse(text));
  } finally {
    clearTimeout(timer);
  }
}
