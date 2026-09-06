/**
 * Everything that happens after the cell pass: the lens blurs, the nine post
 * effects, the light points and the reveal mask.
 *
 * All of it is plain Canvas2D. Each stage takes the layer the effect has been
 * drawn onto and either paints over it or replaces it with a reworked copy, so
 * they compose in the order the caller runs them.
 */

import { clamp, clamp01, hexToRgb, type AsciiParams, type PfxKey } from "./types";

export type Layer = HTMLCanvasElement;

function ctxOf(c: Layer): CanvasRenderingContext2D {
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  return ctx;
}

/** A scratch canvas the same size as `like`, reused via the pool the caller owns. */
export function makeLayer(w: number, h: number): Layer {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.floor(w));
  c.height = Math.max(1, Math.floor(h));
  return c;
}

/* ------------------------------------------------------------------ blur -- */

/**
 * Applies `blurType` to `layer` in place.
 *
 * Gaussian blurs the lot. The rest blur a copy and then bring the sharp
 * original back through a gradient, which is what makes a tilt-shift band or a
 * lens's sweet spot: the mask decides where sharp wins.
 */
export function applyBlur(layer: Layer, scratch: Layer, p: AsciiParams) {
  if (p.blurType === "off" || p.blurAmount <= 0) return;
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  // blurAmount is a 0-100 dial; 40px of radius at the top end reads as "very".
  const radius = (p.blurAmount / 100) * 40;

  if (p.blurType === "directional") {
    // Smeared along blurAngle by drawing the layer back over itself, stepped.
    const a = (p.blurAngle * Math.PI) / 180;
    const steps = 12;
    const sctx = ctxOf(scratch);
    sctx.clearRect(0, 0, w, h);
    sctx.drawImage(layer, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1 / steps;
    for (let i = 0; i < steps; i++) {
      const t = p.directionalBothSides ? (i / (steps - 1)) * 2 - 1 : i / (steps - 1);
      ctx.drawImage(scratch, Math.cos(a) * radius * t, Math.sin(a) * radius * t);
    }
    ctx.globalAlpha = 1;
    return;
  }

  const sctx = ctxOf(scratch);
  sctx.clearRect(0, 0, w, h);
  sctx.filter = `blur(${radius.toFixed(2)}px)`;
  sctx.drawImage(layer, 0, 0);
  sctx.filter = "none";

  if (p.blurType === "gaussian") {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(scratch, 0, 0);
    return;
  }

  // The sharp copy is masked down to the in-focus region, then laid back on top.
  const sharp = makeLayer(w, h);
  const shctx = ctxOf(sharp);
  shctx.drawImage(layer, 0, 0);
  shctx.globalCompositeOperation = "destination-in";
  shctx.fillStyle = focusMask(shctx, w, h, p);
  shctx.fillRect(0, 0, w, h);
  shctx.globalCompositeOperation = "source-over";

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(scratch, 0, 0);
  ctx.drawImage(sharp, 0, 0);
}

/** White where the image stays sharp, transparent where the blur takes over. */
function focusMask(ctx: CanvasRenderingContext2D, w: number, h: number, p: AsciiParams): CanvasGradient {
  if (p.blurType === "lens") {
    const cx = (p.blurCenterX / 100) * w;
    const cy = (p.blurCenterY / 100) * h;
    const r = (Math.max(w, h) / 2) * (p.lensFocus / 100) * 1.6;
    const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, Math.max(r, 1));
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    return g;
  }

  if (p.blurType === "progressive") {
    const at = clamp01(p.progressivePosition / 100);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const stops: [number, string][] = [
      [0, "rgba(255,255,255,1)"],
      [clamp01(at), "rgba(255,255,255,0)"]
    ];
    for (const [pos, col] of p.progressiveReverse ? stops.map(([s, c]) => [1 - s, c] as [number, string]).reverse() : stops) {
      g.addColorStop(clamp01(pos), col);
    }
    return g;
  }

  // tilt: a sharp band across the frame, feathered at both edges.
  const pos = clamp01(p.tiltPosition / 100) * h;
  const band = (p.tiltFocus / 100) * h * 0.5;
  const feather = Math.max(1, (p.tiltFeather / 100) * h * 0.5);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const a = clamp01((pos - band - feather) / h);
  const b = clamp01((pos - band) / h);
  const c = clamp01((pos + band) / h);
  const d = clamp01((pos + band + feather) / h);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(a, "rgba(255,255,255,0)");
  g.addColorStop(b, "rgba(255,255,255,1)");
  g.addColorStop(c, "rgba(255,255,255,1)");
  g.addColorStop(d, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  return g;
}

/* ------------------------------------------------------------------ tint -- */

export function applyTint(layer: Layer, p: AsciiParams) {
  if (p.tintOpacity <= 0) return;
  const ctx = ctxOf(layer);
  const [r, g, b] = hexToRgb(p.tint);
  ctx.save();
  // Kept inside the existing pixels: a tint shouldn't paint the empty ground.
  ctx.globalCompositeOperation = p.overlayBlend;
  ctx.globalAlpha = clamp01(p.tintOpacity / 100);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, layer.width, layer.height);
  ctx.restore();
}

/* ---------------------------------------------------------- post effects -- */

/** A tiling noise field, built once and re-blitted at a shifting offset. */
let noiseTile: HTMLCanvasElement | null = null;
function getNoiseTile(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const size = 128;
  const c = makeLayer(size, size);
  const ctx = ctxOf(c);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + Math.random() * 135;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

/** Runs every enabled entry in `pfx`, each at its own 0-100 intensity. */
export function applyPfx(layer: Layer, scratch: Layer, p: AsciiParams, time: number) {
  const order: PfxKey[] = [
    "pixelate",
    "halftone",
    "bloom",
    "chromatic",
    "glitch",
    "scanLines",
    "filmGrain",
    "filmDust",
    "vignette"
  ];
  for (const key of order) {
    const fx = p.pfx?.[key];
    if (!fx?.enabled) continue;
    const k = clamp01(fx.intensity / 100);
    switch (key) {
      case "pixelate":
        pixelate(layer, scratch, k);
        break;
      case "halftone":
        halftone(layer, k);
        break;
      case "bloom":
        bloom(layer, scratch, k);
        break;
      case "chromatic":
        chromatic(layer, scratch, k);
        break;
      case "glitch":
        glitch(layer, scratch, k, time);
        break;
      case "scanLines":
        scanLines(layer, k);
        break;
      case "filmGrain":
        filmGrain(layer, k, time);
        break;
      case "filmDust":
        filmDust(layer, k, time);
        break;
      case "vignette":
        vignette(layer, k);
        break;
    }
  }
}

function pixelate(layer: Layer, scratch: Layer, k: number) {
  const w = layer.width;
  const h = layer.height;
  const f = Math.max(2, Math.round(2 + k * 22));
  const sw = Math.max(1, Math.floor(w / f));
  const sh = Math.max(1, Math.floor(h / f));
  const sctx = ctxOf(scratch);
  sctx.clearRect(0, 0, w, h);
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(layer, 0, 0, w, h, 0, 0, sw, sh);
  const ctx = ctxOf(layer);
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scratch, 0, 0, sw, sh, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

function halftone(layer: Layer, k: number) {
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  const step = 6;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgba(0,0,0,${(k * 0.5).toFixed(3)})`;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, step * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function bloom(layer: Layer, scratch: Layer, k: number) {
  const w = layer.width;
  const h = layer.height;
  const sctx = ctxOf(scratch);
  sctx.clearRect(0, 0, w, h);
  sctx.filter = `blur(${(4 + k * 18).toFixed(1)}px) brightness(1.35)`;
  sctx.drawImage(layer, 0, 0);
  sctx.filter = "none";
  const ctx = ctxOf(layer);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.25 + k * 0.6;
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

function chromatic(layer: Layer, scratch: Layer, k: number) {
  const w = layer.width;
  const h = layer.height;
  const off = 1 + k * 9;
  const sctx = ctxOf(scratch);
  sctx.clearRect(0, 0, w, h);
  sctx.drawImage(layer, 0, 0);
  const ctx = ctxOf(layer);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.45;
  ctx.filter = "url(#none)";
  ctx.filter = "none";
  // Red pulled one way, cyan the other — the cheap lens-fringe trick.
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(scratch, -off, 0);
  ctx.drawImage(scratch, off, 0);
  ctx.restore();
}

function glitch(layer: Layer, scratch: Layer, k: number, time: number) {
  const w = layer.width;
  const h = layer.height;
  const sctx = ctxOf(scratch);
  sctx.clearRect(0, 0, w, h);
  sctx.drawImage(layer, 0, 0);
  const ctx = ctxOf(layer);
  const slices = Math.round(3 + k * 14);
  const seed = Math.floor(time * 8);
  for (let i = 0; i < slices; i++) {
    const n = Math.abs(Math.sin((seed + i * 37) * 12.9898) * 43758.5453) % 1;
    const sy = n * h;
    const sh = 4 + n * k * 60;
    const dx = (n - 0.5) * k * 120;
    ctx.clearRect(0, sy, w, sh);
    ctx.drawImage(scratch, 0, sy, w, sh, dx, sy, w, sh);
  }
}

function scanLines(layer: Layer, k: number) {
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${(k * 0.55).toFixed(3)})`;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

function filmGrain(layer: Layer, k: number, time: number) {
  const ctx = ctxOf(layer);
  const tile = getNoiseTile();
  const w = layer.width;
  const h = layer.height;
  const jitter = Math.floor(time * 24);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = k * 0.5;
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) {
    ctx.translate(-(jitter % 128), -((jitter * 7) % 128));
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w + 128, h + 128);
  }
  ctx.restore();
}

function filmDust(layer: Layer, k: number, time: number) {
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  const frame = Math.floor(time * 12);
  const specks = Math.round(6 + k * 50);
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${(0.25 + k * 0.5).toFixed(3)})`;
  for (let i = 0; i < specks; i++) {
    const n1 = Math.abs(Math.sin((frame + i * 17) * 78.233) * 43758.5453) % 1;
    const n2 = Math.abs(Math.sin((frame + i * 53) * 12.9898) * 43758.5453) % 1;
    const n3 = Math.abs(Math.sin((frame + i * 91) * 39.425) * 43758.5453) % 1;
    if (n3 > 0.55) {
      ctx.fillRect(n1 * w, n2 * h, 1 + n3 * 1.5, 1 + n3 * 8);
    } else {
      ctx.beginPath();
      ctx.arc(n1 * w, n2 * h, 0.5 + n3 * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function vignette(layer: Layer, k: number) {
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${clamp(k * 1.1, 0, 1).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ---------------------------------------------------------------- lights -- */

export function applyLights(layer: Layer, p: AsciiParams) {
  if (!p.lights?.enabled || p.lights.points.length === 0) return;
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  const diag = Math.hypot(w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const pt of p.lights.points) {
    const cx = clamp01(pt.x) * w;
    const cy = clamp01(pt.y) * h;
    const r = Math.max(1, pt.radius * diag);
    const a = clamp01((pt.intensity ?? 0) / 100);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,236,200,${(a * 0.9).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(255,214,150,${(a * 0.32).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ mask -- */

/**
 * Punches the effect away wherever the mask paints, so the plain photo beneath
 * shows through. White in the mask means "reveal the photo" unless inverted.
 */
export function applyMask(layer: Layer, mask: HTMLImageElement, invert: boolean) {
  const ctx = ctxOf(layer);
  const w = layer.width;
  const h = layer.height;
  ctx.save();
  ctx.globalCompositeOperation = invert ? "destination-in" : "destination-out";
  ctx.drawImage(mask, 0, 0, w, h);
  ctx.restore();
}
