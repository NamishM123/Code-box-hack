import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UNSPLASH_API = "https://api.unsplash.com";

const QUERIES: Record<string, string> = {
  office: "modern office interior design",
  bedroom: "bedroom interior design aesthetic",
  "living-room": "living room interior design cozy",
};

export async function GET(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "missing_key", message: "UNSPLASH_ACCESS_KEY is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "office";
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "20";

  const query = QUERIES[category] || QUERIES.office;

  const url = `${UNSPLASH_API}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=portrait&content_filter=high`;

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "unsplash_error", message: text },
      { status: res.status }
    );
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
      photographer: p.user.name,
    })
  );

  return NextResponse.json({ photos, total: data.total, totalPages: data.total_pages });
}
