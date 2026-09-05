import * as THREE from "three";

/**
 * Procedural textures. No asset files, no CDN, no license questions —
 * generated once into a canvas and cached.
 */

const cache = new Map<string, THREE.Texture>();

/** Light oak plank floor, the standard dollhouse-render floor. */
export function woodFloor(repeatX = 6, repeatY = 6): THREE.Texture {
  const key = `wood-${repeatX}-${repeatY}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 512;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#D9C9AE";
  ctx.fillRect(0, 0, S, S);

  const plankH = S / 8;
  for (let row = 0; row < 8; row++) {
    const y = row * plankH;
    // plank base tone varies subtly row to row
    const tone = 208 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${tone}, ${tone - 18}, ${tone - 44})`;
    ctx.fillRect(0, y, S, plankH - 1);

    // grain
    for (let g = 0; g < 26; g++) {
      const gy = y + Math.random() * plankH;
      ctx.strokeStyle = `rgba(150,120,88,${0.04 + Math.random() * 0.07})`;
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= S; x += 32) {
        ctx.lineTo(x, gy + Math.sin((x + row * 40) / 46) * 1.6);
      }
      ctx.stroke();
    }

    // seam between rows
    ctx.fillStyle = "rgba(120,96,68,0.30)";
    ctx.fillRect(0, y + plankH - 1, S, 1.2);

    // staggered plank ends
    const offset = (row % 3) * (S / 3);
    for (let e = 0; e < 3; e++) {
      const x = (offset + e * (S / 3)) % S;
      ctx.fillStyle = "rgba(120,96,68,0.30)";
      ctx.fillRect(x, y, 1.2, plankH - 1);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Subtle woven texture for a rug. */
export function rugWeave(color: string): THREE.Texture {
  const key = `rug-${color}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 256;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, S);

  for (let i = 0; i < S; i += 3) {
    ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.03})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
