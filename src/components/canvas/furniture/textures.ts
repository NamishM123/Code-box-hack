import * as THREE from "three";
import { seeded, shade, toRgb } from "@/lib/furniture";

/**
 * Every texture here is drawn procedurally into a canvas at runtime. No image
 * assets, no network fetch: the rendered view works offline and in preview
 * deploys, and materials stay tied to whatever color the listing reports.
 */

const cache = new Map<string, THREE.Texture | null>();

function draw(key: string, size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void, srgb = true) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") {
    cache.set(key, null);
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cache.set(key, null);
    return null;
  }
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

function noise(ctx: CanvasRenderingContext2D, size: number, amount: number, seed: string) {
  const rand = seeded(seed);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Oak-ish floorboards: plank seams, end joints, soft grain. */
export function woodFloorTexture(color: string) {
  return draw(`floor:${color}`, 1024, (ctx, size) => {
    const rand = seeded(`floor${color}`);
    const planks = 8;
    const ph = size / planks;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < planks; i++) {
      const y = i * ph;
      ctx.fillStyle = shade(color, (rand() - 0.5) * 0.14);
      ctx.fillRect(0, y, size, ph);
      // grain
      for (let g = 0; g < 26; g++) {
        ctx.strokeStyle = shade(color, -0.08 - rand() * 0.12);
        ctx.globalAlpha = 0.12 + rand() * 0.16;
        ctx.lineWidth = 0.6 + rand() * 1.4;
        ctx.beginPath();
        const gy = y + rand() * ph;
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.3, gy + (rand() - 0.5) * 6, size * 0.7, gy + (rand() - 0.5) * 6, size, gy + (rand() - 0.5) * 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // plank seam
      ctx.fillStyle = shade(color, -0.45);
      ctx.fillRect(0, y, size, 1.5);
      // end joint, staggered
      const jx = Math.floor(rand() * size);
      ctx.fillRect(jx, y, 1.5, ph);
    }
    noise(ctx, size, 12, `floorgrain${color}`);
  });
}

/** Flat plaster with a faint roll texture so walls are not dead surfaces. */
export function plasterTexture(color: string) {
  return draw(`plaster:${color}`, 512, (ctx, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    const rand = seeded(`plaster${color}`);
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.003 + rand() * 0.004;
      ctx.fillStyle = rand() > 0.5 ? "#ffffff" : "#000000";
      const r = 60 + rand() * 150;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    noise(ctx, size, 5, `plasternoise${color}`);
  });
}

/** Grayscale weave used as a bump map on upholstery. */
export function weaveBumpTexture() {
  return draw(
    "weave",
    256,
    (ctx, size) => {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, size, size);
      const step = 6;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const up = ((x / step) + (y / step)) % 2 === 0;
          ctx.fillStyle = up ? "#9c9c9c" : "#666666";
          ctx.fillRect(x, y, step - 1, step - 1);
        }
      }
      noise(ctx, size, 26, "weave");
    },
    false
  );
}

/** Rug pile with a woven border, drawn from the listing color. */
export function rugTexture(color: string) {
  return draw(`rug:${color}`, 512, (ctx, size) => {
    const rand = seeded(`rug${color}`);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      ctx.globalAlpha = 0.06 + rand() * 0.1;
      ctx.strokeStyle = shade(color, (rand() - 0.45) * 0.3);
      ctx.lineWidth = 1 + rand();
      const x = rand() * size;
      const y = rand() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 10, y + (rand() - 0.5) * 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const inset = size * 0.055;
    ctx.strokeStyle = shade(color, -0.22);
    ctx.lineWidth = size * 0.012;
    ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
    ctx.strokeStyle = shade(color, 0.16);
    ctx.lineWidth = size * 0.006;
    ctx.strokeRect(inset * 1.9, inset * 1.9, size - inset * 3.8, size - inset * 3.8);
  });
}

/** A quiet abstract print so framed art is not a flat rectangle. */
export function artTexture(color: string, seed: string) {
  return draw(`art:${color}:${seed}`, 512, (ctx, size) => {
    const rand = seeded(`art${seed}`);
    const [r, g, b] = toRgb(color);
    ctx.fillStyle = shade("#F3EFE6", -0.02);
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.5 + rand() * 0.35;
      ctx.fillStyle = `rgb(${r + (rand() - 0.5) * 50}, ${g + (rand() - 0.5) * 50}, ${b + (rand() - 0.5) * 50})`;
      ctx.beginPath();
      if (rand() > 0.45) {
        ctx.ellipse(size * (0.2 + rand() * 0.6), size * (0.2 + rand() * 0.6), size * (0.08 + rand() * 0.26), size * (0.08 + rand() * 0.3), rand() * Math.PI, 0, Math.PI * 2);
      } else {
        const w = size * (0.12 + rand() * 0.4);
        ctx.rect(size * rand() * 0.6, size * rand() * 0.6, w, size * (0.1 + rand() * 0.5));
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    noise(ctx, size, 10, `artnoise${seed}`);
  });
}

/** A UV-cloned copy so two meshes can tile the same drawing differently. */
export function tiled(tex: THREE.Texture | null, repeatX: number, repeatY: number) {
  if (!tex) return null;
  const clone = tex.clone();
  clone.needsUpdate = true;
  clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeatX, repeatY);
  return clone;
}
