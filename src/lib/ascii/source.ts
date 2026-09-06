/**
 * The picture the effect samples.
 *
 * The look was authored against a photograph, and the reference file that
 * preset shipped with (ref-029.webp) isn't in this repository — nor is there
 * any network route to fetch one. So the source is painted here instead.
 *
 * The thing that matters, and the thing a first attempt at this gets wrong: a
 * dither can only resolve detail the source actually contains. Soft blobs on an
 * empty ground dither into scattered dots, because that is honestly all that is
 * there. So this paints like a photograph of a border in full bloom — heads
 * packed edge to edge and overflowing the frame, each one built from dozens of
 * individual florets or layered petals, kept sharp enough to carry
 * high-frequency detail down to the cell grid, over a dense bed of foliage with
 * no empty black left to speak of.
 *
 * Deterministic: same garden on every load, on every machine. Pass a real photo
 * to `loadImageSource` and the renderer will sample that instead.
 */

import { mulberry32 } from "./types";

/** hue, saturation, lightness — jittered per petal, so blooms aren't flat. */
type Hsl = [number, number, number];

/** Cream, gold and dusty blush: the reference's own range, warmed to the site's. */
const PALETTES: Hsl[][] = [
  [[44, 28, 90], [38, 34, 72]],
  [[41, 74, 64], [32, 68, 44]],
  [[8, 42, 74], [4, 38, 54]],
  [[46, 16, 93], [40, 22, 76]],
  [[20, 48, 58], [16, 46, 38]]
];

const FOLIAGE: Hsl[] = [
  [96, 22, 13],
  [88, 26, 9],
  [104, 18, 17]
];

function hsl([h, s, l]: Hsl, dl = 0, a = 1): string {
  const li = Math.max(0, Math.min(100, l + dl));
  return a >= 1 ? `hsl(${h} ${s}% ${li}%)` : `hsl(${h} ${s}% ${li}% / ${a})`;
}

/**
 * Paints the garden into `canvas`.
 *
 * Four passes back to front — bed, far heads, mid heads, near heads — each one
 * sharper and brighter than the last, which is what gives the dither something
 * to separate into depth rather than one flat speckle.
 */
export function paintInkGarden(canvas: HTMLCanvasElement, seed = 29): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const rnd = mulberry32(seed);
  const unit = Math.min(w, h);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0a0907";
  ctx.fillRect(0, 0, w, h);

  // A warm bed under everything, so no part of the frame samples as pure black.
  for (const [x, y, r, color] of [
    [0.22 * w, 0.18 * h, 0.62 * w, "rgba(120, 74, 32, 0.22)"],
    [0.86 * w, 0.62 * h, 0.58 * w, "rgba(96, 72, 40, 0.18)"],
    [0.5 * w, 0.95 * h, 0.55 * w, "rgba(60, 58, 38, 0.16)"]
  ] as [number, number, number, string][]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  paintFoliage(ctx, w, h, unit, rnd);

  // Heads, back to front. Overflowing the frame on every side is what keeps the
  // edges as busy as the middle — a border doesn't stop at the crop.
  paintLayer(ctx, w, h, unit, rnd, { count: 12, min: 0.10, max: 0.15, blur: 7, shade: -26, alpha: 0.9 });
  paintLayer(ctx, w, h, unit, rnd, { count: 9, min: 0.13, max: 0.19, blur: 2.4, shade: -6, alpha: 0.97 });
  paintLayer(ctx, w, h, unit, rnd, { count: 6, min: 0.16, max: 0.25, blur: 0.7, shade: 10, alpha: 1 });

  // Barely any vignette — the reference is lit to the corners, and anything
  // heavier here simply deletes the flowers the dither was meant to draw.
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, unit * 0.5, w * 0.5, h * 0.5, unit * 1.15);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  return canvas;
}

/**
 * Runs `draw` on its own canvas and lays the result down blurred.
 *
 * `ctx.filter` applies to every single draw call, so setting a blur and then
 * painting thirty thousand petals blurs thirty thousand times over and takes
 * seconds. One blurred `drawImage` of a flat layer is the same picture for a
 * rounding error of the cost.
 */
function blurredLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  blur: number,
  alpha: number,
  draw: (c: CanvasRenderingContext2D) => void
) {
  if (blur <= 0.05) {
    ctx.save();
    ctx.globalAlpha = alpha;
    draw(ctx);
    ctx.restore();
    return;
  }
  const layer = document.createElement("canvas");
  layer.width = w;
  layer.height = h;
  const lctx = layer.getContext("2d");
  if (!lctx) return;
  draw(lctx);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
  ctx.filter = "none";
}

interface LayerOpts {
  count: number;
  /** Head radius, as a fraction of the frame's short side. */
  min: number;
  max: number;
  blur: number;
  /** Lightness offset — far heads sit back, near heads come forward. */
  shade: number;
  alpha: number;
}

function paintLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  rnd: () => number,
  o: LayerOpts
) {
  blurredLayer(ctx, w, h, o.blur, o.alpha, (c) => {
    for (let i = 0; i < o.count; i++) {
      const x = (-0.08 + rnd() * 1.16) * w;
      const y = (-0.08 + rnd() * 1.16) * h;
      const r = (o.min + rnd() * (o.max - o.min)) * unit;
      const palette = PALETTES[Math.floor(rnd() * PALETTES.length)];
      if (rnd() < 0.62) paintCluster(c, x, y, r, palette, o.shade, rnd);
      else paintRose(c, x, y, r, palette, o.shade, rnd);
    }
  });
}

/**
 * A hydrangea head: dozens of small four-petal florets packed into a disc.
 *
 * This is the shape that carries the effect. Each floret is only a few cells
 * across once sampled, so a head resolves as a textured mass rather than a
 * smooth circle — which is exactly the difference between "a flower" and "a
 * bunch of dots".
 */
function paintCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  palette: Hsl[],
  shade: number,
  rnd: () => number
) {
  const florets = Math.max(20, Math.min(110, Math.round((r / 13) * (r / 13) * 1.7)));
  const [light, dark] = palette;

  // A soft mass underneath, so the gaps between florets don't read as holes.
  const bed = ctx.createRadialGradient(x, y, 0, x, y, r);
  bed.addColorStop(0, hsl(dark, shade + 4, 0.85));
  bed.addColorStop(0.75, hsl(dark, shade - 12, 0.6));
  bed.addColorStop(1, hsl(dark, shade - 30, 0));
  ctx.fillStyle = bed;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < florets; i++) {
    // Square-rooted radius keeps the packing even rather than centre-heavy.
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * r * 0.94;
    const fx = x + Math.cos(a) * d;
    const fy = y + Math.sin(a) * d;
    const fr = r * (0.13 + rnd() * 0.08);
    // Florets at the rim fall away from the light.
    const fall = (1 - d / r) * 14 - 7;
    const jitter = (rnd() - 0.5) * 14;
    const turn = rnd() * Math.PI;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(turn);
    for (let p = 0; p < 4; p++) {
      ctx.save();
      ctx.rotate((p / 4) * Math.PI * 2);
      const g = ctx.createLinearGradient(0, 0, 0, -fr);
      g.addColorStop(0, hsl(light, shade + fall + jitter - 10));
      g.addColorStop(0.6, hsl(light, shade + fall + jitter));
      g.addColorStop(1, hsl(dark, shade + fall + jitter - 16));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -fr * 0.6, fr * 0.42, fr * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // The floret's eye — a hard bright speck, the highest-frequency detail here.
    ctx.fillStyle = hsl(light, shade + 16);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.7, fr * 0.17), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** A rose: petals in rings, each ring smaller and turned off the last. */
function paintRose(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  palette: Hsl[],
  shade: number,
  rnd: () => number
) {
  const [light, dark] = palette;
  const rings = 5;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rnd() * Math.PI * 2);

  for (let ring = rings - 1; ring >= 0; ring--) {
    const rr = r * (0.32 + (ring / (rings - 1)) * 0.68);
    const petals = 5 + ring * 2;
    const lift = (rings - 1 - ring) * 5;
    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i / petals) * Math.PI * 2 + ring * 0.55);
      const g = ctx.createLinearGradient(0, -rr * 0.15, 0, -rr);
      g.addColorStop(0, hsl(light, shade + lift + 6));
      g.addColorStop(0.55, hsl(light, shade + lift - 6));
      g.addColorStop(1, hsl(dark, shade + lift - 20));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -rr * 0.52, rr * 0.34, rr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // A rim on the petal's edge: the specular line that reads as a fold.
      ctx.strokeStyle = hsl(light, shade + lift + 18, 0.5);
      ctx.lineWidth = Math.max(0.6, rr * 0.03);
      ctx.stroke();
      ctx.restore();
    }
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  core.addColorStop(0, hsl(dark, shade - 18));
  core.addColorStop(1, hsl(light, shade + 4, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The bed the heads sit in: overlapping leaves across the whole frame. */
function paintFoliage(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  rnd: () => number
) {
  blurredLayer(ctx, w, h, 2.5, 1, (c) => paintLeaves(c, w, h, unit, rnd));
}

function paintLeaves(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  rnd: () => number
) {
  for (let i = 0; i < 70; i++) {
    const x = (-0.05 + rnd() * 1.1) * w;
    const y = (-0.05 + rnd() * 1.1) * h;
    const len = unit * (0.05 + rnd() * 0.13);
    const wide = len * (0.3 + rnd() * 0.25);
    const turn = rnd() * Math.PI * 2;
    const tone = FOLIAGE[Math.floor(rnd() * FOLIAGE.length)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, hsl(tone, 6, 0.9));
    g.addColorStop(1, hsl(tone, -10, 0.5));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, -wide, len, 0);
    ctx.quadraticCurveTo(len * 0.5, wide, 0, 0);
    ctx.fill();
    // The midrib, one shade up — a hard line through an otherwise soft shape.
    ctx.strokeStyle = hsl(tone, 12, 0.55);
    ctx.lineWidth = Math.max(0.6, len * 0.016);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Softens a loaded image before it is sampled.
 *
 * Use this when the only file to hand is a screenshot of a dither rather than
 * the photograph behind it. Screening an already-screened image beats one dot
 * grid against another and moires badly; blurring first averages the dots back
 * into the continuous tone they were standing in for, which is a lossy but
 * perfectly serviceable source. A radius of roughly one dot pitch is right —
 * for a 9px cell, 5 to 8.
 *
 * Leave it at 0 for a real photograph. Blurring one only throws detail away.
 */
export function descreen(img: HTMLImageElement, radius: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
  }
  return c;
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
