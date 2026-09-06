/**
 * The renderer.
 *
 * Pipeline, in order:
 *   1. draw the source into a layer at the target size (bgMode decides whether
 *      anything of it survives behind the effect)
 *   2. divide that into cellSize cells and take each cell's average colour
 *   3. stamp a primitive per cell, per renderMode
 *   4. brightness, contrast, saturation, grayscale, tint, blur
 *   5. the post effects listed in pfx
 *   6. light points
 *   7. the reveal mask, back to the plain photo
 *
 * Steps 2 and part of 4 are cached: the grid is only re-sampled when the size,
 * the source or a tone parameter actually changes, so an animating frame costs
 * the stamp pass and nothing else.
 */

import { applyBlur, applyLights, applyMask, applyPfx, applyTint, makeLayer, type Layer } from "./effects";
import { drawCell, needsFineGrid, type CellPaint, type FineGrid } from "./shapes";
import {
  cellHash,
  charsFor,
  clamp,
  clamp01,
  type AsciiParams
} from "./types";

export type SourceImage = HTMLCanvasElement | HTMLImageElement;

/** Which parameters, when changed, force a re-sample rather than just a redraw. */
function sampleKey(p: AsciiParams, w: number, h: number): string {
  return [
    w,
    h,
    p.cellSize,
    p.renderMode,
    p.brightness,
    p.contrast,
    p.saturation,
    p.grayscale,
    p.invert,
    p.edgeEmphasis,
    p.toneCurve.map((pt) => `${pt.x},${pt.y}`).join("|")
  ].join(":");
}

/** Piecewise-linear luminance remap through the tone curve's points. */
function curveAt(curve: { x: number; y: number }[], v: number): number {
  if (curve.length < 2) return v;
  const pts = [...curve].sort((a, b) => a.x - b.x);
  if (v <= pts[0].x) return pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (v <= b.x) {
      const span = b.x - a.x;
      const t = span <= 0 ? 0 : (v - a.x) / span;
      return a.y + (b.y - a.y) * t;
    }
  }
  return pts[pts.length - 1].y;
}

/** Source-space crop that fills a w×h frame without distorting the picture. */
function coverCrop(sw: number, sh: number, w: number, h: number) {
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  return { sx: (sw - cw) / 2, sy: (sh - ch) / 2, sw: cw, sh: ch };
}

export class AsciiRenderer {
  private target: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private params: AsciiParams;
  private source: SourceImage | null = null;
  private maskImage: HTMLImageElement | null = null;

  private work: Layer | null = null;
  private scratch: Layer | null = null;
  private sampler: Layer | null = null;

  private cols = 0;
  private rows = 0;
  private lum: Float32Array = new Float32Array(0);
  private colors: string[] = [];
  private fine: FineGrid | null = null;
  private key = "";

  /** Reused across every cell of every frame — see the note in shapes.ts. */
  private paint: CellPaint;

  constructor(target: HTMLCanvasElement, params: AsciiParams) {
    const ctx = target.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.target = target;
    this.tctx = ctx;
    this.params = params;
    this.paint = {
      ctx,
      params,
      x: 0,
      y: 0,
      size: params.cellSize,
      cx: 0,
      cy: 0,
      lum: 0,
      color: "#fff",
      col: 0,
      row: 0,
      cols: 0,
      rows: 0,
      time: 0,
      density: 1,
      rnd: 0,
      lumGrid: this.lum,
      fine: null,
      chars: charsFor(params)
    };
  }

  setParams(p: AsciiParams) {
    this.params = p;
    this.paint.params = p;
    this.paint.chars = charsFor(p);
  }

  setSource(src: SourceImage | null) {
    this.source = src;
    this.key = "";
  }

  setMask(img: HTMLImageElement | null) {
    this.maskImage = img;
  }

  /** Sizes the backing store. `w`/`h` are CSS px; `dpr` the device ratio to bake in. */
  resize(w: number, h: number, dpr: number) {
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (this.target.width === pw && this.target.height === ph) return;
    this.target.width = pw;
    this.target.height = ph;
    this.work = makeLayer(pw, ph);
    this.scratch = makeLayer(pw, ph);
    this.key = "";
  }

  /* --------------------------------------------------------------- sample -- */

  private sample() {
    const p = this.params;
    const w = this.target.width;
    const h = this.target.height;
    const src = this.source;
    if (!src || w === 0 || h === 0) return;

    const key = sampleKey(p, w, h);
    if (key === this.key) return;
    this.key = key;

    const cell = Math.max(2, p.cellSize);
    const cols = Math.max(1, Math.ceil(w / cell));
    const rows = Math.max(1, Math.ceil(h / cell));
    this.cols = cols;
    this.rows = rows;

    const sw = "naturalWidth" in src ? src.naturalWidth : src.width;
    const sh = "naturalHeight" in src ? src.naturalHeight : src.height;
    if (!sw || !sh) return;
    const crop = coverCrop(sw, sh, w, h);

    // Downscaling to exactly one pixel per cell is the average — the browser's
    // own filtering does the box-sampling for us, far faster than looping.
    if (!this.sampler) this.sampler = makeLayer(cols, rows);
    this.sampler.width = cols;
    this.sampler.height = rows;
    const sctx = this.sampler.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.clearRect(0, 0, cols, rows);
    sctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cols, rows);
    const data = sctx.getImageData(0, 0, cols, rows).data;

    const n = cols * rows;
    if (this.lum.length !== n) this.lum = new Float32Array(n);
    if (this.colors.length !== n) this.colors = new Array(n);

    const bright = p.brightness / 100;
    const contrast = p.contrast / 100;
    const sat = p.saturation / 100;
    const gray = clamp01(p.grayscale / 100);
    const base = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      let r = data[i * 4] / 255;
      let g = data[i * 4 + 1] / 255;
      let b = data[i * 4 + 2] / 255;

      // brightness, then contrast about mid-grey, then saturation, then grey.
      r = clamp01(r + bright);
      g = clamp01(g + bright);
      b = clamp01(b + bright);
      r = clamp01((r - 0.5) * contrast + 0.5);
      g = clamp01((g - 0.5) * contrast + 0.5);
      b = clamp01((b - 0.5) * contrast + 0.5);
      let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = clamp01(y + (r - y) * sat);
      g = clamp01(y + (g - y) * sat);
      b = clamp01(y + (b - y) * sat);
      if (gray > 0) {
        y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = r + (y - r) * gray;
        g = g + (y - g) * gray;
        b = b + (y - b) * gray;
      }

      const l = clamp01(curveAt(p.toneCurve, 0.2126 * r + 0.7152 * g + 0.0722 * b));
      base[i] = l;
      this.colors[i] = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    }

    // Edge emphasis: a Sobel over the tone map, added back on top so cells that
    // sit on a boundary survive a threshold their neighbours don't.
    const e = clamp01(p.edgeEmphasis / 100);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        let l = base[i];
        if (e > 0) {
          const at = (c: number, r: number) =>
            base[clamp(r, 0, rows - 1) * cols + clamp(c, 0, cols - 1)];
          const gx =
            -at(col - 1, row - 1) - 2 * at(col - 1, row) - at(col - 1, row + 1) +
            at(col + 1, row - 1) + 2 * at(col + 1, row) + at(col + 1, row + 1);
          const gy =
            -at(col - 1, row - 1) - 2 * at(col, row - 1) - at(col + 1, row - 1) +
            at(col - 1, row + 1) + 2 * at(col, row + 1) + at(col + 1, row + 1);
          l = clamp01(l + Math.min(1, Math.hypot(gx, gy)) * e);
        }
        this.lum[i] = p.invert ? 1 - l : l;
      }
    }

    this.paint.lumGrid = this.lum;
    this.fine = needsFineGrid(p.renderMode) ? this.sampleFine(src, crop, cols, rows, p) : null;
  }

  /** A 2x4-per-cell tone map, for braille and half blocks. */
  private sampleFine(
    src: SourceImage,
    crop: { sx: number; sy: number; sw: number; sh: number },
    cols: number,
    rows: number,
    p: AsciiParams
  ): FineGrid | null {
    const fc = cols * 2;
    const fr = rows * 4;
    const c = makeLayer(fc, fr);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, fc, fr);
    const d = ctx.getImageData(0, 0, fc, fr).data;
    const out = new Float32Array(fc * fr);
    const contrast = p.contrast / 100;
    const bright = p.brightness / 100;
    for (let i = 0; i < out.length; i++) {
      const y =
        (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      const v = clamp01((clamp01(y + bright) - 0.5) * contrast + 0.5);
      out[i] = p.invert ? 1 - v : v;
    }
    return { data: out, cols: fc, rows: fr, sx: 2, sy: 4 };
  }

  /* ---------------------------------------------------------------- frame -- */

  /** Draws one frame. `time` is seconds since the effect started. */
  render(time: number) {
    const p = this.params;
    const w = this.target.width;
    const h = this.target.height;
    if (w === 0 || h === 0 || !this.source) return;
    if (!this.work || !this.scratch) {
      this.work = makeLayer(w, h);
      this.scratch = makeLayer(w, h);
    }

    this.sample();

    const wctx = this.work.getContext("2d");
    if (!wctx) return;
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.clearRect(0, 0, w, h);

    this.drawBackdrop(wctx, w, h);
    this.drawCells(wctx, w, h, time);

    applyTint(this.work, p);
    applyBlur(this.work, this.scratch, p);
    applyPfx(this.work, this.scratch, p, time);
    applyLights(this.work, p);

    this.tctx.setTransform(1, 0, 0, 1, 0, 0);
    this.tctx.clearRect(0, 0, w, h);

    if (p.mask?.enabled && this.maskImage) {
      // The plain photo goes down first; the mask then eats the matching part of
      // the effect, so the photo reads through the hole.
      const crop = this.sourceCrop(w, h);
      if (crop) {
        this.tctx.drawImage(this.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
      }
      applyMask(this.work, this.maskImage, !!p.mask.invert);
    }

    this.tctx.drawImage(this.work, 0, 0);
  }

  private sourceCrop(w: number, h: number) {
    const src = this.source;
    if (!src) return null;
    const sw = "naturalWidth" in src ? src.naturalWidth : src.width;
    const sh = "naturalHeight" in src ? src.naturalHeight : src.height;
    if (!sw || !sh) return null;
    return coverCrop(sw, sh, w, h);
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const p = this.params;
    if (p.bgMode === "none") return;
    const alpha = clamp01(p.bgOpacity / 100);
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.bgMode === "color") {
      ctx.fillStyle = p.bgColor ?? "#12100e";
      ctx.fillRect(0, 0, w, h);
    } else {
      const crop = this.sourceCrop(w, h);
      if (crop && this.source) {
        if (p.bgMode === "blur") ctx.filter = `blur(${Math.max(0, p.bgBlur)}px)`;
        ctx.drawImage(this.source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
        ctx.filter = "none";
      }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------- cells -- */

  private drawCells(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const p = this.params;
    const cell = Math.max(2, p.cellSize);
    const cols = this.cols;
    const rows = this.rows;
    if (cols === 0 || rows === 0) return;

    const paint = this.paint;
    paint.ctx = ctx;
    paint.size = cell;
    paint.cols = cols;
    paint.rows = rows;
    paint.time = time;
    paint.fine = this.fine;
    paint.lumGrid = this.lum;
    // density is a 0-100 dial for how big each mark is drawn.
    paint.density = 0.25 + clamp01(p.density / 100) * 1.15;

    const coverage = clamp01(p.coverage / 100);
    const animate = p.animated && p.animIntensity.enabled;
    const amp = animate ? clamp01(p.animIntensity.intensity / 100) : 0;
    const speed = (p.animSpeed.enabled ? clamp01(p.animSpeed.intensity / 100) : 0) * 2.2;
    const t = time * speed;
    const midX = cols / 2;
    const midY = rows / 2;
    const diag = Math.hypot(midX, midY) || 1;

    ctx.save();
    ctx.globalCompositeOperation = p.styleBlend;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    let lastFill = "";

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const rnd = cellHash(col, row);
        if (coverage < 1 && rnd >= coverage) continue;

        let lum = this.lum[i];
        if (lum <= 0.002 && p.renderMode !== "pixel" && p.renderMode !== "matrix") continue;

        // The animation only ever modulates tone; every mode reads tone, so one
        // hook drives the lot.
        if (amp > 0 && speed > 0) {
          switch (p.animStyle) {
            case "pulse":
              lum *= 1 + amp * 0.55 * Math.sin(t * 1.6);
              break;
            case "wave":
              lum *= 1 + amp * 0.6 * Math.sin(t * 1.8 - col * 0.16 - row * 0.07);
              break;
            case "ripple": {
              const d = Math.hypot(col - midX, row - midY) / diag;
              lum *= 1 + amp * 0.65 * Math.sin(t * 2.4 - d * 9);
              break;
            }
            case "shimmer":
              lum *= 1 + amp * 0.8 * (cellHash(col, row, Math.floor(t * 3)) - 0.5);
              break;
            case "flicker": {
              const f = cellHash(col, row, Math.floor(t * 6));
              lum *= f < 0.12 ? 1 - amp : 1 + amp * 0.25 * f;
              break;
            }
          }
          lum = clamp01(lum);
          if (lum <= 0.002) continue;
        }

        const color = this.colors[i];
        if (color !== lastFill) {
          ctx.fillStyle = color;
          lastFill = color;
        }

        paint.col = col;
        paint.row = row;
        paint.x = col * cell;
        paint.y = row * cell;
        paint.cx = paint.x + cell / 2;
        paint.cy = paint.y + cell / 2;
        paint.lum = lum;
        paint.color = color;
        paint.rnd = rnd;

        drawCell(p.renderMode, paint);

        // A few modes set their own fill; make sure the cache notices.
        if (p.renderMode === "disco" || p.renderMode === "matrix") lastFill = "";
      }
    }

    ctx.restore();
  }
}
