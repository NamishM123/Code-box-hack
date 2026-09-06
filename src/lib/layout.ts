import { CLEARANCES } from "./principles";
import type { DetectedRoom, LayoutOption, PlacedItem, Product, RoomSpec, FitVerdict } from "./types";

interface Ctx {
  W: number;
  D: number;
  existing: { x: number; y: number; w: number; d: number }[];
  door?: { x: number; y: number; w: number; wall: string };
  window?: { x: number; y: number; w: number; wall: string };
}

function makeCtx(room: RoomSpec, detected?: DetectedRoom): Ctx {
  const W = room.widthFt;
  const D = room.depthFt;
  const existing = (detected?.existing || []).map((e) => ({ x: e.x, y: e.y, w: e.widthFt, d: e.depthFt }));
  const door = detected?.openings.find((o) => o.kind === "door");
  const window = detected?.openings.find((o) => o.kind === "window");
  const pos = (o: any) => {
    if (!o) return undefined;
    const p = o.positionFt;
    if (o.wall === "N") return { x: p, y: 0, w: o.widthFt, wall: "N" };
    if (o.wall === "S") return { x: p, y: D, w: o.widthFt, wall: "S" };
    if (o.wall === "W") return { x: 0, y: p, w: o.widthFt, wall: "W" };
    return { x: W, y: p, w: o.widthFt, wall: "E" };
  };
  return { W, D, existing, door: pos(door), window: pos(window) };
}

function collides(x: number, y: number, w: number, d: number, ctx: Ctx): FitVerdict {
  if (x - w / 2 < 0 || y - d / 2 < 0 || x + w / 2 > ctx.W || y + d / 2 > ctx.D) return "conflict";
  for (const e of ctx.existing) {
    const dx = Math.abs(x - e.x); const dy = Math.abs(y - e.y);
    if (dx < (w + e.w) / 2 && dy < (d + e.d) / 2) return "conflict";
  }
  if (ctx.door) {
    const swing = 3.2;
    const dx = x - ctx.door.x, dy = y - ctx.door.y;
    if (Math.hypot(dx, dy) < swing) return "conflict";
  }
  // tight walkway check
  let tight = false;
  for (const e of ctx.existing) {
    const gap = Math.hypot(x - e.x, y - e.y) - (Math.max(w, d) + Math.max(e.w, e.d)) / 2;
    if (gap > 0 && gap < CLEARANCES.walkwayFt - 0.6) tight = true;
  }
  return tight ? "tight" : "fits";
}

interface PlaceOpts { rotation?: number; note: string }

function place(items: PlacedItem[], ctx: Ctx, product: Product, x: number, y: number, opts: PlaceOpts): void {
  const fit = collides(x, y, product.width, product.depth, ctx);
  items.push({ productId: product.id, x, y, rotation: opts.rotation ?? 0, fit, rationale: [opts.note] });
  ctx.existing.push({ x, y, w: product.width, d: product.depth });
}

/**
 * Generate three principled layout variants.
 * 1. Command — feng shui: primary piece sees the door but not in line with it.
 * 2. Salon — conversational cluster around a rug, intimacy gradient from entry.
 * 3. Airy — Alexander's "light on two sides": align to windows, keep centers open.
 */
export function generateLayouts(room: RoomSpec, products: Product[], detected?: DetectedRoom): LayoutOption[] {
  return [
    variantCommand(room, products, detected),
    variantSalon(room, products, detected),
    variantAiry(room, products, detected)
  ];
}

function variantCommand(room: RoomSpec, products: Product[], detected?: DetectedRoom): LayoutOption {
  const ctx = makeCtx(room, detected);
  const placed: PlacedItem[] = [];
  const notes: string[] = [];

  const rug = products.find((p) => p.category === "rug");
  if (rug) place(placed, ctx, rug, ctx.W / 2, ctx.D / 2, { note: "Rug centers the group and anchors the seat." });

  const primary = products.find((p) => ["bed", "sofa"].includes(p.category));
  if (primary) {
    const doorSide = ctx.door?.wall || "N";
    const isBed = primary.category === "bed";
    const y = doorSide === "N" ? ctx.D - primary.depth / 2 - 0.8 : primary.depth / 2 + 0.8;
    const x = isBed ? ctx.W / 2 : Math.min(ctx.W - primary.width / 2 - 0.6, ctx.W / 2 + 0.8);
    place(placed, ctx, primary, x, y, { note: "Command position: sees the entry without being in line with it." });
    notes.push("Command position honored for the " + primary.category + ".");
  }

  const table = products.find((p) => p.category === "table");
  const sofa = placed.find((p) => products.find((x) => x.id === p.productId)?.category === "sofa");
  if (table && sofa) place(placed, ctx, table, sofa.x, sofa.y - 2.5, { note: "18 in from the sofa front edge, standard reach." });

  const chair = products.find((p) => p.category === "chair");
  if (chair) place(placed, ctx, chair, 1.8, 1.6, { rotation: 30, note: "Angled to break the box and open the entry." });

  const plant = products.find((p) => p.category === "plant");
  if (plant) place(placed, ctx, plant, ctx.W - 1.4, 1.4, { note: "Bagua wealth corner: vertical anchor pulls the eye through." });

  const lamp = products.find((p) => p.category === "lamp");
  if (lamp) place(placed, ctx, lamp, ctx.W - 1, ctx.D - 1.2, { note: "Secondary light source completes the triangle." });

  const shelf = products.find((p) => p.category === "shelf");
  if (shelf) place(placed, ctx, shelf, 0.7, ctx.D / 2, { rotation: 90, note: "Long wall keeps storage out of the walkway." });

  const art = products.find((p) => p.category === "art");
  if (art) place(placed, ctx, art, ctx.W / 2, 0.15, { note: "Centered above the primary piece for symmetry." });

  return { id: "command", name: "Command", method: "Feng shui command + bagua accents", placed, score: 0.92, notes };
}

function variantSalon(room: RoomSpec, products: Product[], detected?: DetectedRoom): LayoutOption {
  const ctx = makeCtx(room, detected);
  const placed: PlacedItem[] = [];
  const rug = products.find((p) => p.category === "rug");
  if (rug) place(placed, ctx, rug, ctx.W / 2, ctx.D / 2 + 0.4, { note: "Rug defines the conversation island." });

  const sofa = products.find((p) => p.category === "sofa");
  if (sofa) place(placed, ctx, sofa, ctx.W / 2, ctx.D / 2 + 2.4, { rotation: 180, note: "Sofa faces into the room to invite conversation." });

  const chair = products.find((p) => p.category === "chair");
  if (chair) place(placed, ctx, chair, ctx.W / 2 - 3.0, ctx.D / 2 - 1.0, { rotation: 70, note: "Chair closes the ring at conversation radius." });

  const chair2Candidates = products.filter((p) => p.category === "chair");
  const chair2 = chair2Candidates[1] || chair2Candidates[0];
  if (chair2 && chair2 !== chair) place(placed, ctx, chair2, ctx.W / 2 + 3.0, ctx.D / 2 - 1.0, { rotation: -70, note: "Mirrored chair completes the arc." });

  const table = products.find((p) => p.category === "table");
  if (table) place(placed, ctx, table, ctx.W / 2, ctx.D / 2, { note: "Centered inside the ring, within reach of every seat." });

  const lamp = products.find((p) => p.category === "lamp");
  if (lamp) place(placed, ctx, lamp, 1.0, ctx.D - 1.2, { note: "Reading corner light. A room needs three light sources." });

  const shelf = products.find((p) => p.category === "shelf");
  if (shelf) place(placed, ctx, shelf, ctx.W - 0.7, ctx.D / 2, { rotation: 90, note: "Storage lines the wall opposite the entry." });

  const plant = products.find((p) => p.category === "plant");
  if (plant) place(placed, ctx, plant, 0.9, 0.9, { note: "Softens the entry corner." });

  const art = products.find((p) => p.category === "art");
  if (art) place(placed, ctx, art, ctx.W / 2, 0.15, { note: "Focal wall behind the primary seat." });

  return { id: "salon", name: "Salon", method: "Conversation ring + intimacy gradient", placed, score: 0.88, notes: [] };
}

function variantAiry(room: RoomSpec, products: Product[], detected?: DetectedRoom): LayoutOption {
  const ctx = makeCtx(room, detected);
  const placed: PlacedItem[] = [];
  const rug = products.find((p) => p.category === "rug");
  if (rug) place(placed, ctx, rug, ctx.W / 2, ctx.D / 2, { note: "Small rug keeps the floor visible for the light to travel." });

  const primary = products.find((p) => ["bed", "sofa", "desk"].includes(p.category));
  if (primary) {
    const win = ctx.window;
    if (win && (win.wall === "N" || win.wall === "S")) {
      const y = win.wall === "N" ? primary.depth / 2 + 1.0 : ctx.D - primary.depth / 2 - 1.0;
      place(placed, ctx, primary, ctx.W / 2, y, { note: "Aligned perpendicular to the window: light on two sides of the piece." });
    } else {
      place(placed, ctx, primary, ctx.W / 2, ctx.D - primary.depth / 2 - 1.2, { rotation: 180, note: "Backed to the long wall, opening the center." });
    }
  }

  const mirror = products.find((p) => p.category === "mirror");
  if (mirror) place(placed, ctx, mirror, 0.4, ctx.D / 2, { rotation: 90, note: "Perpendicular to the window: fakes a second light source." });

  const table = products.find((p) => p.category === "table");
  if (table) place(placed, ctx, table, ctx.W / 2, ctx.D / 2 - 0.4, { note: "Small footprint keeps the center airy." });

  const chair = products.find((p) => p.category === "chair");
  if (chair) place(placed, ctx, chair, ctx.W - 1.6, 1.8, { rotation: 200, note: "Reading corner facing the window." });

  const plant = products.find((p) => p.category === "plant");
  if (plant) place(placed, ctx, plant, ctx.W - 1.1, ctx.D - 1.1, { note: "Corner verticality without weight." });

  const lamp = products.find((p) => p.category === "lamp");
  if (lamp) place(placed, ctx, lamp, 1.0, ctx.D - 1.2, { note: "Warm secondary light for evenings." });

  const art = products.find((p) => p.category === "art");
  if (art) place(placed, ctx, art, ctx.W / 2, 0.15, { note: "One quiet focal piece; the room does the rest." });

  return { id: "airy", name: "Airy", method: "Light on two sides + open center", placed, score: 0.86, notes: [] };
}
