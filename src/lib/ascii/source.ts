/**
 * The picture the effect samples.
 *
 * The look was authored against a photograph, but the reference file that
 * preset shipped with (ref-029.webp) isn't in this repository, so the source is
 * painted here instead: a seeded field of blooms in the site's own palette.
 * It is deterministic — same garden on every load, on every machine — and the
 * renderer never knows the difference, because all it ever does is downsample
 * whatever canvas it is handed.
 *
 * Drop a real photo in and pass its URL to `loadImageSource` if one ever
 * arrives; `paintInkGarden` is only the fallback.
 */

import { mulberry32 } from "./types";

/** Warm blacks and metals lifted straight off the site's CSS custom properties. */
const PETALS = [
  ["#E0AE55", "#A8571A"],
  ["#F2EFE8", "#B0684A"],
  ["#D9541F", "#6A2E10"],
  ["#E8E3D9", "#8C6A3E"],
  ["#B0684A", "#4A2A1C"]
];
const LEAF = ["#5A6B54", "#2C3A2A"];

/**
 * Paints a garden of blooms into `canvas`.
 *
 * The renderer reads tone, not detail, so everything here is drawn soft: wide
 * radial washes, petals with a bright core falling to nothing at the tip, and a
 * closing blur so the dither resolves it as gradient rather than as noise.
 */
export function paintInkGarden(canvas: HTMLCanvasElement, seed = 29): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rnd = mulberry32(seed);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0a0908";
  ctx.fillRect(0, 0, w, h);

  // Two low washes so the empty ground still has somewhere to fall away to.
  for (const [x, y, r, color] of [
    [0.18 * w, 0.08 * h, 0.75 * w, "rgba(168,87,26,0.38)"],
    [0.92 * w, 0.72 * h, 0.66 * w, "rgba(224,174,85,0.22)"]
  ] as [number, number, number, string][]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  const unit = Math.min(w, h);

  // Stems first, so every bloom sits on top of its own stalk.
  const blooms: { x: number; y: number; r: number; palette: string[]; petals: number }[] = [];
  const count = 17;
  for (let i = 0; i < count; i++) {
    const big = i < 7;
    const x = (0.06 + rnd() * 0.88) * w;
    const y = (0.08 + rnd() * 0.78) * h;
    const r = (big ? 0.15 + rnd() * 0.09 : 0.05 + rnd() * 0.05) * unit;
    blooms.push({
      x,
      y,
      r,
      palette: PETALS[Math.floor(rnd() * PETALS.length)],
      petals: 5 + Math.floor(rnd() * 7)
    });
  }

  ctx.filter = "blur(3px)";
  for (const b of blooms) {
    const baseX = b.x + (rnd() - 0.5) * 0.18 * w;
    ctx.strokeStyle = LEAF[0];
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1.5, b.r * 0.09);
    ctx.beginPath();
    ctx.moveTo(baseX, h + 20);
    ctx.quadraticCurveTo(baseX + (b.x - baseX) * 0.4, (b.y + h) * 0.55, b.x, b.y);
    ctx.stroke();

    // One leaf per stem, a filled lens shape hung off the midpoint.
    const lx = (baseX + b.x) / 2;
    const ly = (h + b.y) / 2;
    const size = b.r * (0.8 + rnd() * 0.9);
    const dir = rnd() < 0.5 ? -1 : 1;
    ctx.fillStyle = LEAF[rnd() < 0.5 ? 0 : 1];
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + dir * size, ly - size * 0.75, lx + dir * size * 1.7, ly - size * 0.1);
    ctx.quadraticCurveTo(lx + dir * size * 0.8, ly + size * 0.55, lx, ly);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const b of blooms) paintBloom(ctx, b.x, b.y, b.r, b.petals, b.palette, rnd);

  ctx.filter = "none";

  // A closing vignette keeps the corners quiet so page text has somewhere to sit.
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, unit * 0.15, w * 0.5, h * 0.5, unit * 0.95);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  return canvas;
}

function paintBloom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  petals: number,
  palette: string[],
  rnd: () => number
) {
  const turn = rnd() * Math.PI * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.filter = `blur(${Math.max(1.5, r * 0.06)}px)`;

  for (let ring = 0; ring < 2; ring++) {
    const rr = r * (ring === 0 ? 1 : 0.62);
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + (ring === 0 ? 0 : Math.PI / petals);
      ctx.save();
      ctx.rotate(a);
      const grad = ctx.createLinearGradient(0, 0, 0, -rr);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(0.55, palette[1]);
      grad.addColorStop(1, "rgba(10,9,8,0)");
      ctx.fillStyle = grad;
      ctx.globalAlpha = ring === 0 ? 0.85 : 0.65;
      ctx.beginPath();
      ctx.ellipse(0, -rr * 0.55, rr * (0.26 + rnd() * 0.08), rr * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // The eye: a hot core, then a scatter of stamen specks around it.
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.4);
  core.addColorStop(0, "#FBF9F5");
  core.addColorStop(0.45, palette[0]);
  core.addColorStop(1, "rgba(10,9,8,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.filter = "none";
  ctx.fillStyle = "#FBF9F5";
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const d = r * (0.12 + rnd() * 0.2);
    ctx.globalAlpha = 0.35 + rnd() * 0.5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.8, r * 0.022), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.filter = "none";
}

/** Loads a photo to sample instead of the painted garden. Resolves null on failure. */
export function loadImageSource(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
