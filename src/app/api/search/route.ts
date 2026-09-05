import { NextResponse } from "next/server";
import { recommend } from "@/lib/recommend";
import type { RoomSpec } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<RoomSpec>;
  const spec: RoomSpec = {
    widthFt: body.widthFt ?? 14,
    depthFt: body.depthFt ?? 12,
    budget: body.budget ?? 2500,
    style: body.style ?? "warm-minimal",
    mustHave: body.mustHave ?? [],
    roomType: body.roomType,
    goal: body.goal,
    vibePalette: body.vibePalette,
    vibeTags: body.vibeTags
  };
  const products = recommend(spec);
  const total = products.reduce((s, p) => s + p.price, 0);
  return NextResponse.json({ spec, products, total });
}
