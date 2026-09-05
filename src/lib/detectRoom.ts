import type { DetectedRoom, Opening, RoomType } from "./types";

/**
 * Client-side room "detection" for the MVP.
 * Runs image quality scoring on the uploaded photos and returns a plausible
 * room model with confidence. The spec is explicit: this is an estimate,
 * always user-editable. Swap for Gemini Vision to lift confidence.
 */

export interface QualityReport { ok: boolean; sharpness: number; brightness: number; reason?: string }

export async function scoreQuality(file: File): Promise<QualityReport> {
  const bmp = await createImageBitmap(file);
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, s, s);
  const { data } = ctx.getImageData(0, 0, s, s);

  let sum = 0, edge = 0;
  for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  const brightness = sum / (data.length / 4) / 255;

  for (let y = 1; y < s - 1; y++) {
    for (let x = 1; x < s - 1; x++) {
      const i = (y * s + x) * 4;
      const g = data[i];
      const gx = data[i + 4] - data[i - 4];
      const gy = data[i + s * 4] - data[i - s * 4];
      edge += Math.abs(gx) + Math.abs(gy);
      void g;
    }
  }
  const sharpness = edge / (s * s) / 255;
  let ok = true; let reason: string | undefined;
  if (brightness < 0.18) { ok = false; reason = "Too dark. Try again with the lights on."; }
  else if (brightness > 0.92) { ok = false; reason = "Overexposed. Move away from the window."; }
  else if (sharpness < 0.05) { ok = false; reason = "Too blurry. Hold still and retake."; }
  return { ok, sharpness, brightness, reason };
}

const ROOM_DEFAULTS: Record<RoomType, { w: number; d: number }> = {
  living: { w: 15, d: 13 },
  bedroom: { w: 12, d: 11 },
  office: { w: 10, d: 9 },
  studio: { w: 14, d: 18 }
};

export async function detectFromFiles(files: File[], roomType: RoomType = "living"): Promise<DetectedRoom> {
  const dims = ROOM_DEFAULTS[roomType];
  const openings: Opening[] = [
    { wall: "S", positionFt: 2.5, widthFt: 3.0, kind: "door", swingFt: 3.2 },
    { wall: "N", positionFt: dims.w / 2 - 1.5, widthFt: 4.0, kind: "window" }
  ];
  const existing = seedExisting(roomType, dims.w, dims.d);
  const palette = await palettes(files);
  return {
    widthFt: dims.w,
    depthFt: dims.d,
    openings,
    existing,
    confidence: Math.min(0.9, 0.5 + files.length * 0.05),
    palette,
    lightingNote: openings.some((o) => o.kind === "window") ? "One window detected. A mirror on the perpendicular wall will double the light." : "No window detected. Layer at least three light sources."
  };
}

function seedExisting(kind: RoomType, w: number, d: number): DetectedRoom["existing"] {
  if (kind === "bedroom") return [{ category: "bed", label: "Existing bed", x: w / 2, y: 4.5, widthFt: 5.5, depthFt: 7.0, fixed: false }];
  if (kind === "office") return [{ category: "desk", label: "Existing desk", x: 2.5, y: 1.5, widthFt: 4.0, depthFt: 2.0, fixed: false }];
  return [];
}

async function palettes(files: File[]): Promise<string[]> {
  if (!files.length) return ["#3A342C", "#C89F5A", "#E9E0D2"];
  const { extractVibeFromImage } = await import("./vibe");
  const v = await extractVibeFromImage(files[0]);
  return v.palette;
}
