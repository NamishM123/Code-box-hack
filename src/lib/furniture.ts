import type { Category, PlacedItem, Product, RoomSpec } from "./types";

/** Standard interior wall height used by the rendered view, in feet. */
export const WALL_HEIGHT_FT = 9;

/* ------------------------------------------------------------------ color */

function clamp255(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function toRgb(hex: string): [number, number, number] {
  const raw = (hex || "").replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return [204, 198, 186];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex(rgb: [number, number, number]) {
  return "#" + rgb.map((v) => clamp255(v).toString(16).padStart(2, "0")).join("");
}

/** Positive amount lightens toward white, negative darkens toward black. -1..1 */
export function shade(hex: string, amount: number) {
  const [r, g, b] = toRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  return toHex([r + (target - r) * p, g + (target - g) * p, b + (target - b) * p]);
}

export function mix(a: string, b: string, t: number) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function luminance(hex: string) {
  const [r, g, b] = toRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/* --------------------------------------------------------------- surfaces */

export type FinishKind = "fabric" | "leather" | "wood" | "metal" | "stone" | "glass" | "paper" | "foliage";

export interface Finish {
  kind: FinishKind;
  roughness: number;
  metalness: number;
}

const FINISH_TABLE: { match: RegExp; finish: Finish }[] = [
  { match: /velvet|boucl|linen|cotton|wool|tweed|fabric|upholst|jute|sisal|weave|canvas/i, finish: { kind: "fabric", roughness: 0.94, metalness: 0 } },
  { match: /leather|suede|hide/i, finish: { kind: "leather", roughness: 0.55, metalness: 0.04 } },
  { match: /oak|walnut|teak|birch|ash|pine|maple|rattan|cane|bamboo|wood|mango/i, finish: { kind: "wood", roughness: 0.62, metalness: 0.02 } },
  { match: /brass|steel|chrome|iron|metal|aluminum|nickel/i, finish: { kind: "metal", roughness: 0.28, metalness: 0.85 } },
  { match: /travertine|marble|stone|concrete|terrazzo|ceramic/i, finish: { kind: "stone", roughness: 0.42, metalness: 0.02 } },
  { match: /glass|mirror|acrylic/i, finish: { kind: "glass", roughness: 0.06, metalness: 0.95 } },
  { match: /paper|rice|linen shade|lantern/i, finish: { kind: "paper", roughness: 0.88, metalness: 0 } }
];

const CATEGORY_FINISH: Partial<Record<Category, Finish>> = {
  sofa: { kind: "fabric", roughness: 0.94, metalness: 0 },
  chair: { kind: "fabric", roughness: 0.9, metalness: 0 },
  bed: { kind: "fabric", roughness: 0.93, metalness: 0 },
  rug: { kind: "fabric", roughness: 0.98, metalness: 0 },
  plant: { kind: "foliage", roughness: 0.8, metalness: 0 },
  mirror: { kind: "glass", roughness: 0.06, metalness: 0.95 },
  table: { kind: "wood", roughness: 0.62, metalness: 0.02 },
  desk: { kind: "wood", roughness: 0.62, metalness: 0.02 },
  shelf: { kind: "wood", roughness: 0.62, metalness: 0.02 },
  dresser: { kind: "wood", roughness: 0.62, metalness: 0.02 },
  nightstand: { kind: "wood", roughness: 0.62, metalness: 0.02 },
  lamp: { kind: "metal", roughness: 0.3, metalness: 0.8 },
  tv: { kind: "metal", roughness: 0.35, metalness: 0.6 },
  art: { kind: "wood", roughness: 0.5, metalness: 0.02 }
};

/** Best guess at how a product's primary surface should catch light. */
export function finishFor(product: Product): Finish {
  const label = `${product.material || ""} ${product.title || ""}`;
  for (const row of FINISH_TABLE) if (row.match.test(label)) return row.finish;
  return CATEGORY_FINISH[product.category] || { kind: "fabric", roughness: 0.85, metalness: 0.02 };
}

/** Wood tone for legs, frames and plinths, tuned to sit under the main color. */
export function legTone(product: Product) {
  const label = `${product.material || ""} ${product.title || ""}`;
  if (/brass|gold/i.test(label)) return "#B08A46";
  if (/chrome|steel|nickel|aluminum/i.test(label)) return "#8C8F93";
  if (/black|matte/i.test(label)) return "#26262A";
  if (/walnut/i.test(label)) return "#4A3324";
  if (/oak|birch|ash|maple|pine/i.test(label)) return "#9A7448";
  return luminance(product.color) > 0.5 ? "#6B4E33" : "#3A2A1E";
}

export const BRASS = "#C09A55";

/* ------------------------------------------------------------- style hints */

/** Keywords in a listing title that change how a piece is built. */
export function hints(product: Product) {
  const t = `${product.title || ""} ${product.material || ""}`.toLowerCase();
  return {
    arc: /\barc\b|arch(ed)? floor lamp|arching/.test(t),
    lantern: /lantern|paper|globe|orb/.test(t),
    ladder: /ladder|leaning/.test(t),
    plinth: /plinth|block|monolith|drum/.test(t),
    arch: /arch(ed)?\b/.test(t),
    platform: /platform|low profile|low\b/.test(t),
    round: /round|circle|oval/.test(t),
    modular: /modular|sectional|cloud/.test(t),
    tufted: /tufted|channel/.test(t),
    dining: /dining|wishbone|windsor|side chair/.test(t)
  };
}

/** Seats a sofa reads as, from its overall width. */
export function seatCount(widthFt: number) {
  return Math.max(1, Math.min(4, Math.floor(widthFt / 2.05)));
}

/* -------------------------------------------------------------- placement */

/** Pieces with a clear front that should never face into a wall. */
const HAS_FRONT: Category[] = ["sofa", "chair", "bed", "desk", "shelf", "dresser", "nightstand", "mirror", "art"];

/** Pieces that hang on a wall rather than stand on the floor. */
export function isWallHung(product: Product) {
  return product.category === "art";
}

/**
 * Yaw in radians for a placed item.
 *
 * The solver decides which way a piece faces, so this trusts it. The flip is
 * only a rescue for a facing that came from somewhere else, a dragged piece or
 * a room saved before the solver existed, and it fires only when a piece is
 * genuinely nose-first into a wall with room behind it. A looser threshold
 * would undo deliberate angles, spinning a chair out of the conversation ring
 * because it happened to sit near a wall.
 */
export function yawFor(item: PlacedItem, product: Product, room: RoomSpec) {
  const base = (-item.rotation * Math.PI) / 180;
  if (!HAS_FRONT.includes(product.category)) return base;

  const fx = Math.sin(base);
  const fz = Math.cos(base);
  const half = (Math.abs(fx) * product.width + Math.abs(fz) * product.depth) / 2;
  const ahead = wallDistance(item.x, item.y, fx, fz, room) - half;
  const behind = wallDistance(item.x, item.y, -fx, -fz, room) - half;

  return ahead < 0.45 && behind > ahead + 1.5 ? base + Math.PI : base;
}

/** Distance from a plan point to the first wall along a direction, in feet. */
function wallDistance(x: number, y: number, dx: number, dz: number, room: RoomSpec) {
  let best = Infinity;
  if (dx > 1e-3) best = Math.min(best, (room.widthFt - x) / dx);
  if (dx < -1e-3) best = Math.min(best, x / -dx);
  if (dz > 1e-3) best = Math.min(best, (room.depthFt - y) / dz);
  if (dz < -1e-3) best = Math.min(best, y / -dz);
  return best;
}

/**
 * A wall color that keeps the room's palette but stays wall-like. A detected
 * palette is sampled from the whole photo, so its first swatch can be a dark
 * sofa or a shadow; painting the walls with it would sink the room.
 */
export function wallToneFrom(palette?: string[]) {
  const base = palette?.[0];
  if (!base) return "#EBE5D9";
  const tinted = mix(base, "#F0EBE0", 0.68);
  return luminance(tinted) < 0.72 ? mix(tinted, "#F4F0E7", 0.55) : tinted;
}

/** Center height for a framed piece hung on a wall, gallery convention. */
export function hangCenterY(heightFt: number, wallHeight = WALL_HEIGHT_FT) {
  const ideal = 4.75;
  const lowest = heightFt / 2 + 2.4;
  const highest = wallHeight - 0.9 - heightFt / 2;
  return Math.max(Math.min(ideal, highest), Math.min(lowest, highest));
}

/* ----------------------------------------------------------------- random */

/** Deterministic 0..1 generator so a given product always renders the same. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RoundedBox blows up when the radius exceeds half the smallest side. */
export function safeRadius(want: number, ...dims: number[]) {
  return Math.max(0.002, Math.min(want, Math.min(...dims) / 2 - 0.004));
}
