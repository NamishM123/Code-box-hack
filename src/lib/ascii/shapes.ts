/**
 * One primitive per cell.
 *
 * Every mode is handed the same mutable `CellPaint` — reused across the whole
 * grid rather than allocated per cell, because a full screen at cellSize 9 is
 * twenty-odd thousand cells a frame and the garbage adds up fast.
 *
 * `lum` arrives already adjusted (tone, contrast, edges, invert, animation) and
 * always means the same thing: 0 is an empty cell, 1 is a full one.
 */

import { cellHash, clamp01, type AsciiParams, type RenderMode } from "./types";

/** A luminance grid sampled finer than the cell grid, for the sub-cell modes. */
export interface FineGrid {
  data: Float32Array;
  cols: number;
  rows: number;
  /** Sub-samples per cell. */
  sx: number;
  sy: number;
}

export interface CellPaint {
  ctx: CanvasRenderingContext2D;
  params: AsciiParams;
  /** Cell box, in device pixels. */
  x: number;
  y: number;
  size: number;
  cx: number;
  cy: number;
  lum: number;
  color: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
  /** Seconds since the effect started. */
  time: number;
  /** density mapped to a mark-size multiplier. */
  density: number;
  /** Stable 0-1 per cell. */
  rnd: number;
  /** The adjusted luminance grid, for modes that need neighbours. */
  lumGrid: Float32Array;
  fine: FineGrid | null;
  /** Glyph ramp, darkest first. */
  chars: string;
}

/** 4x4 ordered Bayer matrix, normalised — the threshold behind "dither". */
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
].map((v) => (v + 0.5) / 16);

/** Modes that need the finer sub-cell sampling. */
export function needsFineGrid(mode: RenderMode): boolean {
  return mode === "braille" || mode === "halfblocks";
}

function fineAt(f: FineGrid, col: number, row: number): number {
  const c = col < 0 ? 0 : col >= f.cols ? f.cols - 1 : col;
  const r = row < 0 ? 0 : row >= f.rows ? f.rows - 1 : row;
  return f.data[r * f.cols + c];
}

function lumAt(p: CellPaint, col: number, row: number): number {
  const c = col < 0 ? 0 : col >= p.cols ? p.cols - 1 : col;
  const r = row < 0 ? 0 : row >= p.rows ? p.rows - 1 : row;
  return p.lumGrid[r * p.cols + c];
}

/** Stamps one cell. Assumes fillStyle is already the cell colour. */
export function drawCell(mode: RenderMode, p: CellPaint) {
  const { ctx, size, cx, cy, lum } = p;
  // The nominal mark radius: cell half-width, scaled by luminance and density.
  const mark = size * 0.5 * lum * p.density;

  switch (mode) {
    case "characters":
    case "hexdump": {
      const ramp = mode === "hexdump" ? "0123456789ABCDEF" : p.chars;
      const idx = Math.min(ramp.length - 1, Math.floor(lum * ramp.length));
      if (idx <= 0 && mode === "characters") return;
      const fs = Math.max(4, Math.round(size * (0.7 + lum * 0.55 * p.density)));
      ctx.font = `${fs}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillText(ramp.charAt(idx), cx, cy);
      return;
    }

    case "dither": {
      // Ordered threshold: the cell is either on or off, and the pattern of
      // which cells survive is what draws the gradient.
      const t = BAYER[(p.row & 3) * 4 + (p.col & 3)];
      if (lum <= t) return;
      const s = Math.max(1, size * (0.45 + lum * 0.55) * p.density * 1.9);
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      return;
    }

    case "mosaic": {
      const s = size * (0.55 + lum * 0.45);
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      return;
    }

    case "pixel":
      ctx.fillRect(p.x, p.y, size, size);
      return;

    case "dots": {
      if (mark < 0.25) return;
      ctx.beginPath();
      ctx.arc(cx, cy, mark, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    case "cross": {
      const a = mark;
      if (a < 0.4) return;
      const t = Math.max(1, size * 0.14 * p.density * 2);
      ctx.fillRect(cx - a, cy - t / 2, a * 2, t);
      ctx.fillRect(cx - t / 2, cy - a, t, a * 2);
      return;
    }

    case "diamond": {
      if (mark < 0.4) return;
      ctx.beginPath();
      ctx.moveTo(cx, cy - mark);
      ctx.lineTo(cx + mark, cy);
      ctx.lineTo(cx, cy + mark);
      ctx.lineTo(cx - mark, cy);
      ctx.closePath();
      ctx.fill();
      return;
    }

    case "voxel": {
      // A little isometric cube: bright top, mid left face, dark right face.
      const s = mark;
      if (s < 0.6) return;
      const hw = s;
      const hh = s * 0.55;
      const d = s * 0.8;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh - d * 0.5);
      ctx.lineTo(cx + hw, cy - d * 0.5);
      ctx.lineTo(cx, cy + hh - d * 0.5);
      ctx.lineTo(cx - hw, cy - d * 0.5);
      ctx.closePath();
      ctx.fill();
      const alpha = ctx.globalAlpha;
      ctx.globalAlpha = alpha * 0.72;
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy - d * 0.5);
      ctx.lineTo(cx, cy + hh - d * 0.5);
      ctx.lineTo(cx, cy + hh + d * 0.5);
      ctx.lineTo(cx - hw, cy + d * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx + hw, cy - d * 0.5);
      ctx.lineTo(cx, cy + hh - d * 0.5);
      ctx.lineTo(cx, cy + hh + d * 0.5);
      ctx.lineTo(cx + hw, cy + d * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;
      return;
    }

    case "lego": {
      const s = size * (0.5 + lum * 0.5);
      if (s < 1) return;
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      return;
    }

    case "mixed": {
      // Four primitives shuffled across the grid by the cell's own hash.
      const pick = Math.floor(p.rnd * 4);
      drawCell(pick === 0 ? "dots" : pick === 1 ? "diamond" : pick === 2 ? "cross" : "mosaic", p);
      return;
    }

    case "lines": {
      const w = size * lum * p.density * 2;
      if (w < 0.4) return;
      const t = Math.max(1, size * 0.3);
      ctx.fillRect(cx - w / 2, cy - t / 2, w, t);
      return;
    }

    case "diagonal": {
      const len = size * lum * p.density * 2.2;
      if (len < 0.4) return;
      const up = ((p.col + p.row) & 1) === 0;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(up ? -Math.PI / 4 : Math.PI / 4);
      ctx.fillRect(-len / 2, -Math.max(0.6, size * 0.14), len, Math.max(1.2, size * 0.28));
      ctx.restore();
      return;
    }

    case "braille": {
      // 2 across, 4 down — the real braille cell, drawn as dots rather than glyphs
      // so it keeps working in any font.
      const f = p.fine;
      if (!f) return;
      const r = Math.max(0.5, size * 0.11 * (0.6 + p.density));
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const v = fineAt(f, p.col * 2 + sx, p.row * 4 + sy);
          if (v <= 0.5) continue;
          const dx = p.x + size * (0.3 + sx * 0.4);
          const dy = p.y + size * (0.16 + sy * 0.23);
          ctx.beginPath();
          ctx.arc(dx, dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    case "disco": {
      if (mark < 0.3) return;
      const hue = (p.rnd * 360 + p.time * 90) % 360;
      ctx.fillStyle = `hsl(${hue.toFixed(0)} 85% ${(35 + lum * 40).toFixed(0)}%)`;
      ctx.beginPath();
      ctx.arc(cx, cy, mark, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    case "matrix": {
      // Green rain: each column has a head falling at its own speed, and a cell
      // only lights when the head is passing over it.
      const speed = 6 + p.rnd * 14;
      const head = ((p.time * speed + p.rnd * p.rows) % (p.rows + 14)) - 7;
      const behind = head - p.row;
      if (behind < 0 || behind > 11) return;
      const fade = 1 - behind / 11;
      const glyph = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ".charAt(
        Math.floor(cellHash(p.col, p.row, Math.floor(p.time * 8)) * 17)
      );
      ctx.fillStyle = behind < 1 ? "#d9ffe4" : `rgba(60, 230, 120, ${(fade * lum).toFixed(3)})`;
      ctx.font = `${Math.max(5, Math.round(size * 1.05))}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillText(glyph, cx, cy);
      return;
    }

    case "rings": {
      if (mark < 0.5) return;
      ctx.lineWidth = Math.max(0.6, size * 0.12);
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx, cy, mark, 0, Math.PI * 2);
      ctx.stroke();
      if (lum > 0.66) {
        ctx.beginPath();
        ctx.arc(cx, cy, mark * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }

    case "hearts": {
      const s = mark * 1.25;
      if (s < 0.6) return;
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.75);
      ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.35, cx - s * 0.5, cy - s * 1.1, cx, cy - s * 0.35);
      ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.1, cx + s * 1.5, cy - s * 0.35, cx, cy + s * 0.75);
      ctx.fill();
      return;
    }

    case "stars": {
      const s = mark * 1.35;
      if (s < 0.6) return;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? s : s * 0.42;
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      return;
    }

    case "hexagons": {
      // Honeycomb: odd rows step half a cell across so the hexes interlock.
      const s = mark * 1.2;
      if (s < 0.5) return;
      const ox = (p.row & 1) === 0 ? 0 : size * 0.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = cx + ox + Math.cos(a) * s;
        const py = cy + Math.sin(a) * s;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      return;
    }

    case "triangles": {
      // Low-poly: the cell splits on a diagonal and each half takes its own
      // corner's tone, so flat areas read as facets rather than squares.
      const flip = ((p.col + p.row) & 1) === 0;
      const x0 = p.x;
      const y0 = p.y;
      const x1 = p.x + size;
      const y1 = p.y + size;
      const a = ctx.globalAlpha;
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x0, y1);
      } else {
        ctx.moveTo(x1, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0, y1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = a * 0.55;
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(x1, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0, y1);
      } else {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x0, y1);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = a;
      return;
    }

    case "bubbles": {
      if (mark < 0.6) return;
      ctx.lineWidth = Math.max(0.5, size * 0.09);
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx, cy, mark, 0, Math.PI * 2);
      ctx.stroke();
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath();
      ctx.arc(cx - mark * 0.32, cy - mark * 0.32, Math.max(0.4, mark * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a;
      return;
    }

    case "hatch": {
      // Pencil cross-hatch: one pass for a light cell, three for a dark one.
      const passes = lum > 0.72 ? 3 : lum > 0.42 ? 2 : lum > 0.12 ? 1 : 0;
      if (passes === 0) return;
      ctx.lineWidth = Math.max(0.5, size * 0.09);
      ctx.strokeStyle = p.color;
      const angles = [-Math.PI / 4, Math.PI / 4, 0];
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < passes; i++) {
        ctx.save();
        ctx.rotate(angles[i]);
        const half = size * 0.62;
        for (let k = -1; k <= 1; k++) {
          const off = k * size * 0.3;
          ctx.beginPath();
          ctx.moveTo(-half, off);
          ctx.lineTo(half, off);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    case "contour": {
      // Topographic: quantise tone into bands and mark only the cells where a
      // band boundary falls between this cell and its right/bottom neighbour.
      const bands = 7;
      const here = Math.floor(lum * bands);
      const right = Math.floor(lumAt(p, p.col + 1, p.row) * bands);
      const down = Math.floor(lumAt(p, p.col, p.row + 1) * bands);
      if (here === right && here === down) return;
      ctx.lineWidth = Math.max(0.7, size * 0.16);
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      if (here !== right) {
        ctx.moveTo(p.x + size, p.y);
        ctx.lineTo(p.x + size, p.y + size);
      }
      if (here !== down) {
        ctx.moveTo(p.x, p.y + size);
        ctx.lineTo(p.x + size, p.y + size);
      }
      ctx.stroke();
      return;
    }

    case "halfblocks": {
      // Two samples down the cell instead of one — twice the vertical detail
      // for the same cell size, the trick the block-drawing characters use.
      const f = p.fine;
      if (!f) return;
      const top = (fineAt(f, p.col * 2, p.row * 4) + fineAt(f, p.col * 2 + 1, p.row * 4 + 1)) / 2;
      const bot = (fineAt(f, p.col * 2, p.row * 4 + 2) + fineAt(f, p.col * 2 + 1, p.row * 4 + 3)) / 2;
      const a = ctx.globalAlpha;
      if (top > 0.06) {
        ctx.globalAlpha = a * clamp01(top);
        ctx.fillRect(p.x, p.y, size, size / 2);
      }
      if (bot > 0.06) {
        ctx.globalAlpha = a * clamp01(bot);
        ctx.fillRect(p.x, p.y + size / 2, size, size / 2);
      }
      ctx.globalAlpha = a;
      return;
    }
  }
}
