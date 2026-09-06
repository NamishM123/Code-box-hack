import { NextResponse } from "next/server";
import { hasGemini, readLook, type InlineImage } from "@/lib/sources/gemini";
import { hasApify, scrapePinterest } from "@/lib/sources/apify";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 6;
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Two entry points:
 *  - JSON  { url }  : a Pinterest pin or board. Apify scrapes it when available,
 *                     otherwise we read the og:image off the page.
 *  - form-data      : the user uploaded screenshots directly.
 *
 * Either way the images go to Gemini for palette + style tags + search terms.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  try {
    const images = contentType.includes("multipart/form-data")
      ? await fromUpload(req)
      : await fromUrl(req);

    if (!images.length) {
      return NextResponse.json({ error: "no_images", message: "Could not read any image." }, { status: 404 });
    }

    if (!hasGemini()) {
      // The client can still extract a palette locally, but it cannot read an
      // inventory, so the shop will fall back to generic per-room queries. Say
      // that plainly instead of returning a bare null.
      return NextResponse.json({
        images: images.map(toDataUrl),
        vibe: null,
        source: "images_only",
        reason: "GOOGLE_AI_API_KEY isn't reaching the server, so the picture can't be read."
      });
    }

    // readLook, not readVibe: the caller needs the inventory of what is
    // actually in the picture, not just its palette, or it goes back to
    // shopping a fixed category mix.
    const vibe = await readLook(images);
    return NextResponse.json({ vibe, images: images.slice(0, 3).map(toDataUrl), source: "gemini" });
  } catch (e) {
    return NextResponse.json(
      {
        error: "vibe_failed",
        reason: `The picture could not be read: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200),
        message: e instanceof Error ? e.message : String(e)
      },
      { status: 502 }
    );
  }
}

async function fromUpload(req: Request): Promise<InlineImage[]> {
  const form = await req.formData();
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  const out: InlineImage[] = [];
  for (const file of files.slice(0, MAX_IMAGES)) {
    if (file.size > MAX_BYTES) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    out.push({ mimeType: file.type || "image/jpeg", data: buf.toString("base64") });
  }
  return out;
}

async function fromUrl(req: Request): Promise<InlineImage[]> {
  const { url } = (await req.json()) as { url?: string };
  if (!url || !/^https?:\/\//.test(url)) throw new Error("Provide a valid URL.");

  let imageUrls: string[] = [];

  if (hasApify() && /pinterest\./.test(url)) {
    imageUrls = await scrapePinterest(url, MAX_IMAGES).catch(() => []);
  }
  if (!imageUrls.length) {
    const og = await ogImage(url);
    if (og) imageUrls = [og];
  }

  const out: InlineImage[] = [];
  for (const src of imageUrls.slice(0, MAX_IMAGES)) {
    const img = await downloadImage(src).catch(() => null);
    if (img) out.push(img);
  }
  return out;
}

async function ogImage(pageUrl: string): Promise<string | null> {
  const res = await fetch(pageUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; SightlineBot/1.0)" }
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return m?.[1] ? decodeEntities(m[1]) : null;
}

async function downloadImage(src: string): Promise<InlineImage | null> {
  const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0 (compatible; SightlineBot/1.0)" } });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return null;
  return { mimeType: type, data: buf.toString("base64") };
}

function toDataUrl(i: InlineImage) {
  return `data:${i.mimeType};base64,${i.data}`;
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
