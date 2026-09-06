import { NextResponse } from "next/server";
import { analyzeRoom, hasGemini, type InlineImage } from "@/lib/sources/gemini";
import type { RoomType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 8;
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if (!hasGemini()) {
    return NextResponse.json({ error: "no_key", message: "GOOGLE_AI_API_KEY is not set." }, { status: 501 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const roomType = (form.get("roomType") as RoomType) || "living";
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "no_photos" }, { status: 400 });

  const images: InlineImage[] = [];
  for (const file of files.slice(0, MAX_IMAGES)) {
    if (file.size > MAX_BYTES) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    images.push({ mimeType: file.type || "image/jpeg", data: buf.toString("base64") });
  }
  if (!images.length) {
    return NextResponse.json({ error: "images_too_large", message: "Each photo must be under 4 MB." }, { status: 400 });
  }

  try {
    const detected = await analyzeRoom(images, roomType);
    return NextResponse.json({ detected, source: "gemini" });
  } catch (e) {
    return NextResponse.json(
      { error: "vision_failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
