import { NextResponse } from "next/server";
import { PRINCIPLES } from "@/lib/principles";
import type { RoomSpec } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: Request) {
  const { spec, placedCategories, vibeTags } = (await req.json()) as {
    spec: RoomSpec;
    placedCategories: string[];
    vibeTags?: string[];
  };
  const suggestions: { title: string; body: string; tradition: string }[] = [];

  const has = (c: string) => placedCategories.includes(c);

  if (!has("mirror") && (vibeTags?.includes("bright") || vibeTags?.includes("airy"))) {
    suggestions.push(pick("light-two-sides"));
  }
  if (!has("plant")) suggestions.push({ title: "Add greenery at the far corner", body: "One tall plant in the corner farthest from the entry will pull the eye through and soften the vertical lines.", tradition: "feng-shui" });
  if (!has("lamp")) suggestions.push({ title: "Layer a second light source", body: "A room needs at least three sources of warm light: overhead, mid-height, and floor.", tradition: "phenomenological" });
  if (has("sofa") && !has("art")) suggestions.push({ title: "Anchor the wall behind the sofa", body: "One large piece (or three at varying heights) at eye-level. Bottom edge 8-10 in above the sofa back.", tradition: "compositional" });
  if (spec.roomType === "bedroom" && !has("nightstand")) suggestions.push({ title: "Balance the bed with a pair", body: "Symmetry at the bed reads as calm. Even one nightstand beats none; two beats one.", tradition: "compositional" });
  if (spec.roomType === "office" && has("desk")) suggestions.push({ title: "Face the door, not the wall", body: "Command position at the desk keeps attention grounded and reduces the low-grade anxiety of a back to the door.", tradition: "feng-shui" });

  if (vibeTags?.includes("moody")) suggestions.push({ title: "Dim the top layer", body: "Moody rooms fail under a bright ceiling. Warm bulbs at 2700K, dimmable, and skip the overhead most nights.", tradition: "phenomenological" });
  if (vibeTags?.includes("bright") || vibeTags?.includes("breezy")) suggestions.push({ title: "Sheer at the window", body: "A single sheer panel keeps the light while softening the frame. Full drapery kills the airiness.", tradition: "compositional" });

  return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
}

function pick(key: string) {
  const p = PRINCIPLES.find((x) => x.key === key)!;
  return { title: p.title, body: p.body, tradition: p.tradition };
}
