/**
 * Vibe extraction — used for Pinterest screenshots and inspiration images.
 * Runs entirely in the browser: samples pixels, k-means-lite a small palette,
 * infers vibe tags from color temperature and saturation.
 * No API keys required. Swap for Gemini Vision later for tag precision.
 */

export interface Vibe {
  palette: string[];
  tags: string[];
  temperature: "warm" | "cool" | "neutral";
  brightness: "dark" | "muted" | "bright";
}

export async function extractVibeFromImage(file: File | Blob): Promise<Vibe> {
  const bitmap = await createImageBitmap(file);
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  return summarize(data);
}

export async function extractVibeFromUrl(url: string): Promise<Vibe> {
  const res = await fetch(url, { mode: "cors" }).catch(() => null);
  if (!res || !res.ok) return fallbackVibe();
  const blob = await res.blob();
  return extractVibeFromImage(blob);
}

function summarize(data: Uint8ClampedArray): Vibe {
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  let R = 0, G = 0, B = 0, N = 0, sat = 0, val = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    R += r; G += g; B += b; N++;
    const { s, v } = rgbToHsv(r, g, b);
    sat += s; val += v;
    const key = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
    const cur = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    cur.r += r; cur.g += g; cur.b += b; cur.n++;
    buckets.set(key, cur);
  }
  if (!N) return fallbackVibe();
  const avgR = R / N, avgG = G / N, avgB = B / N;
  const avgS = sat / N, avgV = val / N;
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  const palette = dedupe(sorted.map((c) => hex(c.r / c.n, c.g / c.n, c.b / c.n)));
  const warmScore = (avgR - avgB) / 255;
  const temperature: Vibe["temperature"] = warmScore > 0.08 ? "warm" : warmScore < -0.08 ? "cool" : "neutral";
  const brightness: Vibe["brightness"] = avgV < 0.35 ? "dark" : avgV < 0.65 ? "muted" : "bright";
  const tags: string[] = [];
  if (temperature === "warm") tags.push("warm", "earthy");
  if (temperature === "cool") tags.push("cool", "airy");
  if (temperature === "neutral") tags.push("quiet");
  if (brightness === "dark") tags.push("moody", "intimate");
  if (brightness === "muted") tags.push("editorial");
  if (brightness === "bright") tags.push("bright", "breezy");
  if (avgS < 0.18) tags.push("minimal", "restrained");
  else if (avgS > 0.45) tags.push("layered", "collected");
  else tags.push("balanced");
  const uniq = Array.from(new Set(tags)).slice(0, 5);
  return { palette: palette.slice(0, 5), tags: uniq, temperature, brightness };
}

function dedupe(hexes: string[]): string[] {
  const out: string[] = [];
  for (const h of hexes) {
    if (!out.some((o) => dist(o, h) < 28)) out.push(h);
  }
  return out;
}

function dist(a: string, b: string) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

function hex(r: number, g: number, b: number) {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
function hexToRgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { s, v };
}
function fallbackVibe(): Vibe {
  return { palette: ["#E9E0D2", "#C89F5A", "#3A342C"], tags: ["warm", "editorial"], temperature: "warm", brightness: "muted" };
}
