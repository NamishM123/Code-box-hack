import * as THREE from "three";

/**
 * Turns a listing photo into a standing cutout of the product.
 *
 * Retailer product shots sit on a flat studio background, so flooding in from
 * the border removes it and leaves the piece itself with a real silhouette.
 * When the flood barely removes anything the photo is a styled room scene, not
 * a product shot; there is nothing to cut out and the caller falls back to the
 * built model rather than pasting a photo of someone else's room into this one.
 */

export type CutoutState =
  | { status: "loading" }
  | { status: "ready"; texture: THREE.Texture; full: THREE.Texture; aspect: number }
  | { status: "unusable" };

const cache = new Map<string, Promise<CutoutState>>();

const MAX_EDGE = 640;
const TOLERANCE = 38;

/**
 * A cutout is only worth showing if the photo really was a product on a plain
 * backdrop. A lifestyle shot flood-fills into a torn, holey mess that looks far
 * worse than the built model, so every one of these has to pass.
 */
const GATE = {
  /** Border pixels that must agree with each other for the backdrop to count as plain. */
  borderUniformity: 0.97,
  /** Border pixels the flood must actually clear. */
  borderCleared: 0.98,
  /** A real backdrop is a decent share of the frame, but never almost all of it. */
  minRemoved: 0.15,
  maxRemoved: 0.93,
  /** How much of its own bounding box the silhouette fills. Confetti fails this. */
  minFill: 0.22,
  /** Outline length against area. A clean silhouette is smooth; a torn one is not. */
  maxRaggedness: 13
};

function texFromCanvas(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function loadCutout(url: string): Promise<CutoutState> {
  const hit = cache.get(url);
  if (hit) return hit;

  const job = new Promise<CutoutState>((resolve) => {
    if (typeof document === "undefined" || !url) return resolve({ status: "unusable" });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve({ status: "unusable" });
    img.onload = () => {
      try {
        resolve(cutOut(img));
      } catch {
        // A cross-origin image without CORS headers taints the canvas and the
        // pixels cannot be read; the built model is the better fallback.
        resolve({ status: "unusable" });
      }
    };
    img.src = url;
  });

  cache.set(url, job);
  return job;
}

function cutOut(img: HTMLImageElement): CutoutState {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { status: "unusable" };
  ctx.drawImage(img, 0, 0, w, h);

  const full = texFromCanvas(canvas);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Average the border to learn what the backdrop is.
  let br = 0;
  let bg = 0;
  let bb = 0;
  let n = 0;
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = (y * w + x) * 4;
      br += px[i];
      bg += px[i + 1];
      bb += px[i + 2];
      n++;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const i = (y * w + x) * 4;
      br += px[i];
      bg += px[i + 1];
      bb += px[i + 2];
      n++;
    }
  }
  br /= n;
  bg /= n;
  bb /= n;

  // How much the border agrees with its own average: a studio backdrop is flat,
  // a photographed room is not.
  let agree = 0;
  const sample = (i: number) => {
    if (Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) < TOLERANCE * 3) agree++;
  };
  for (let x = 0; x < w; x++) {
    sample((0 * w + x) * 4);
    sample(((h - 1) * w + x) * 4);
  }
  for (let y = 0; y < h; y++) {
    sample((y * w + 0) * 4);
    sample((y * w + (w - 1)) * 4);
  }
  const borderMatch = agree / n;

  // Flood the backdrop inward from every border pixel.
  const seen = new Uint8Array(w * h);
  const queue: number[] = [];
  const near = (i: number) => Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb) < TOLERANCE * 3;

  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (seen[p]) return;
    if (!near(p * 4)) return;
    seen[p] = 1;
    queue.push(p);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  let removed = 0;
  while (queue.length) {
    const p = queue.pop() as number;
    px[p * 4 + 3] = 0;
    removed++;
    const x = p % w;
    const y = (p / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const removedFraction = removed / (w * h);
  if (removedFraction < GATE.minRemoved || removedFraction > GATE.maxRemoved) return { status: "unusable" };
  if (borderMatch < GATE.borderUniformity) return { status: "unusable" };

  // The flood should have cleared the frame. Anything left touching the edge
  // means the backdrop was not a backdrop.
  let borderOpaque = 0;
  let borderTotal = 0;
  const alphaAt = (x: number, y: number) => px[(y * w + x) * 4 + 3];
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      if (alphaAt(x, y) > 8) borderOpaque++;
      borderTotal++;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      if (alphaAt(x, y) > 8) borderOpaque++;
      borderTotal++;
    }
  }
  if (1 - borderOpaque / borderTotal < GATE.borderCleared) return { status: "unusable" };

  // Crop to what is left so the piece sits on the floor, not on empty pixels,
  // and measure how clean that silhouette is.
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let opaque = 0;
  let outline = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, y) <= 8) continue;
      opaque++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (
        x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        alphaAt(x - 1, y) <= 8 || alphaAt(x + 1, y) <= 8 || alphaAt(x, y - 1) <= 8 || alphaAt(x, y + 1) <= 8
      ) {
        outline++;
      }
    }
  }
  if (maxX <= minX || maxY <= minY || opaque === 0) return { status: "unusable" };
  if (opaque / ((maxX - minX + 1) * (maxY - minY + 1)) < GATE.minFill) return { status: "unusable" };
  if (outline / Math.sqrt(opaque) > GATE.maxRaggedness) return { status: "unusable" };

  ctx.putImageData(data, 0, 0);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = document.createElement("canvas");
  cropped.width = cw;
  cropped.height = ch;
  const cctx = cropped.getContext("2d");
  if (!cctx) return { status: "unusable" };
  cctx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);

  return { status: "ready", texture: texFromCanvas(cropped), full, aspect: cw / ch };
}
