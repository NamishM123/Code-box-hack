import { NextResponse } from "next/server";

/**
 * Best-effort Pinterest scrape.
 * Pinterest embeds an og:image tag with the source pin.
 * If it fails, the client falls back to prompting for an upload.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { url } = (await req.json()) as { url: string };
  if (!url || !/pinterest\./.test(url)) return NextResponse.json({ error: "Not a Pinterest URL" }, { status: 400 });
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; SightlineBot/1.0)" } });
    if (!res.ok) throw new Error("fetch failed");
    const html = await res.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const image = m?.[1];
    if (!image) return NextResponse.json({ error: "No image found" }, { status: 404 });
    return NextResponse.json({ image });
  } catch (e) {
    return NextResponse.json({ error: "Could not fetch pin" }, { status: 502 });
  }
}
