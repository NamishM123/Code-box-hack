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

/**
 * Every reader that is configured, in the order they should be tried.
 * VISION_PROVIDER pins one; otherwise OpenAI leads and Google backs it up.
 *
 * A list rather than a single choice, because a key that exists is not a key
 * that works. An OpenAI account out of credits answers 429 to every request,
 * and picking OpenAI once and giving up left a perfectly good Google key
 * unused while the picture went unread.
 */
export function visionProviders(): VisionProvider[] {
  const pinned = process.env.VISION_PROVIDER?.toLowerCase();
  if (pinned === "openai") return process.env.OPENAI_API_KEY ? ["openai"] : [];
  if (pinned === "gemini") return hasGemini() ? ["gemini"] : [];

  const out: VisionProvider[] = [];
  if (process.env.OPENAI_API_KEY) out.push("openai");
  if (hasGemini()) out.push("gemini");
  return out;
}

/** The reader that gets first go. */
export function visionProvider(): VisionProvider | null {
  return visionProviders()[0] ?? null;
}

export function hasVision() {
  return visionProviders().length > 0;
}

/** Names the keys that were looked for, so a failure can say what's missing. */
export const VISION_KEYS = ["OPENAI_API_KEY", "GOOGLE_AI_API_KEY"];

export interface LookRead {
  look: GeminiLook;
  /** Which reader actually answered, as opposed to which one went first. */
  provider: VisionProvider;
}

/**
 * Reads the picture through whichever configured model answers first.
 *
 * When they all fail, every failure goes into the message. The first one is
 * usually the one that matters -- "no credits remaining" is a billing problem,
 * and nothing in this file can code around it. What matters is that the caller
 * finds out, because the alternative is shopping for furniture nobody saw.
 */
export async function readLook(images: InlineImage[]): Promise<LookRead> {
  const providers = visionProviders();
  if (!providers.length) throw new Error(`No vision key found. Looked for ${VISION_KEYS.join(" and ")}.`);

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const look = provider === "openai" ? await readLookOpenAI(images) : await readLookGemini(images);
      return { look, provider };
    } catch (e) {
      failures.push(`${provider}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(failures.join(" | "));
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
