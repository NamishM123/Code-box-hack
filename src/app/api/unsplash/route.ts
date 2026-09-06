import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UNSPLASH_API = "https://api.unsplash.com";

/**
 * Room and vibe are two independent axes that combine: the room says what the
 * space is, the vibe says how it should feel. Either can stand alone.
 *
 *   ?room=bathroom&q=japandi  -> "japandi bathroom interior"
 *   ?room=bathroom            -> "bathroom interior design modern"
 *   ?q=dark academia          -> "dark academia interior design"
 */

/** Room fragment used when a vibe is carrying the search. */
const ROOMS: Record<string, string> = {
  any: "interior design",
  office: "home office interior",
  bedroom: "bedroom interior",
  bathroom: "bathroom interior",
  "living-room": "living room interior"
};

/** Fuller phrasing for a bare room, so an unsearched feed isn't as flat. */
const ROOM_ONLY: Record<string, string> = {
  any: "interior design home aesthetic",
  office: "modern office interior design",
  bedroom: "bedroom interior design aesthetic",
  bathroom: "bathroom interior design modern",
  "living-room": "living room interior design cozy"
};

/**
 * The vibe is typed by the reader and goes to a third party, so it is stripped
 * back to letters, digits and the few marks a style name actually uses, then
 * capped. Long enough for "mid-century modern warm neutral", short enough that
 * nobody can push a paragraph through it.
 */
function cleanVibe(raw: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/[^\p{L}\p{N}\s&'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Keeps page/per_page numeric — they are interpolated into the request URL. */
function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function GET(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "missing_key", message: "UNSPLASH_ACCESS_KEY is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);

  // `category` is the older single-axis param; `room` supersedes it.
  const requested = searchParams.get("room") || searchParams.get("category") || "any";
  const room = requested in ROOMS ? requested : "any";

  const vibe = cleanVibe(searchParams.get("q"));
  const page = clampInt(searchParams.get("page"), 1, 1, 100);
  const perPage = clampInt(searchParams.get("per_page"), 20, 1, 30);

  const query = vibe ? `${vibe} ${ROOMS[room]}` : ROOM_ONLY[room];

  const url =
    `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}` +
    `&page=${page}&per_page=${perPage}&orientation=portrait&content_filter=high`;

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` }
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "unsplash_error", message: text }, { status: res.status });
  }

  const data = await res.json();

  const photos = data.results.map(
    (p: {
      id: string;
      urls: { small: string; regular: string };
      alt_description: string | null;
      description: string | null;
      width: number;
      height: number;
      user: { name: string };
    }) => ({
      id: p.id,
      src: p.urls.small,
      srcLarge: p.urls.regular,
      alt: p.alt_description || p.description || "Interior design",
      width: p.width,
      height: p.height,
      aspect: p.height / p.width,
      photographer: p.user.name
    })
  );

  // `query` comes back so the page can show what it actually searched for.
  return NextResponse.json({ photos, total: data.total, totalPages: data.total_pages, query });
}
