import { CLEARANCES } from "./principles";
import { bounds, corners, distance, facing, insideRoom, lateralOffset, overlaps, separation, type Rect, type Vec } from "./geometry";
import type { Category, DetectedRoom, FitVerdict, LayoutOption, PlacedItem, Product, RoomSpec } from "./types";

/**
 * Furniture placement.
 *
 * Positions are solved, not scripted: every piece proposes candidate spots,
 * each candidate is rejected outright if it breaks a hard rule (outside the
 * room, overlapping another piece, inside the door swing, pinching a walkway),
 * and what survives is scored on feng shui and on how the room reads. The piece
 * takes the best-scoring spot.
 *
 * That ordering matters. A scored suggestion can be wrong about taste; a hard
 * rule is never allowed to be wrong about space, because the fit verdict the
 * shopper buys against depends on it.
 */

type Wall = "N" | "E" | "S" | "W";

/** A piece's front faces local +y, so this is the rotation that turns it inward. */
const FACE_INWARD: Record<Wall, number> = { N: 0, E: 90, S: 180, W: 270 };

interface Opening {
  wall: Wall;
  from: number;
  to: number;
  kind: "door" | "window";
}

interface Slot {
  rect: Rect;
  product: Product;
}

interface Scene {
  W: number;
  D: number;
  openings: Opening[];
  entry: { at: Vec; wall: Wall };
  blockers: Rect[];
  slots: Slot[];
  items: PlacedItem[];
  notes: string[];
}

interface Weights {
  /** Command position, solid backing, a clear entry. */
  fengShui: number;
  /** Seats pulled into a conversation ring rather than pinned to the walls. */
  gather: number;
  /** Floor left open and pieces kept to the perimeter. */
  openness: number;
}

const DOOR_SWING_FT = 3.2;
const TV_DIAGONAL_RATIO = 1.1478; // 16:9 panel: diagonal from width
const TV_VIEW_MULTIPLE = 1.9;

/* ------------------------------------------------------------------ scene */

function buildScene(room: RoomSpec, detected?: DetectedRoom): Scene {
  const W = room.widthFt;
  const D = room.depthFt;
  const openings: Opening[] = (detected?.openings || []).map((o) => ({
    wall: o.wall as Wall,
    from: o.positionFt,
    to: o.positionFt + o.widthFt,
    kind: o.kind
  }));

  const door = openings.find((o) => o.kind === "door");
  // With no detected door, the plan is read the way it is drawn: you come in
  // from the near wall.
  const entry = door
    ? { at: alongWall(door.wall, (door.from + door.to) / 2, W, D), wall: door.wall }
    : { at: [W / 2, D] as Vec, wall: "S" as Wall };

  const blockers: Rect[] = (detected?.existing || []).map((e) => ({ x: e.x, y: e.y, w: e.widthFt, d: e.depthFt, rot: 0 }));

  return { W, D, openings, entry, blockers, slots: [], items: [], notes: [] };
}

/** A point on a wall, `along` feet from that wall's origin. */
function alongWall(wall: Wall, along: number, W: number, D: number): Vec {
  if (wall === "N") return [along, 0];
  if (wall === "S") return [along, D];
  if (wall === "W") return [0, along];
  return [W, along];
}

function wallLength(wall: Wall, W: number, D: number) {
  return wall === "N" || wall === "S" ? W : D;
}

/** Places a piece flat against a wall, `along` feet from that wall's origin. */
function againstWall(wall: Wall, along: number, product: Product, scene: Scene, standoff = 0): Rect {
  const rot = FACE_INWARD[wall];
  const back = product.depth / 2 + standoff;
  if (wall === "N") return { x: along, y: back, w: product.width, d: product.depth, rot };
  if (wall === "S") return { x: along, y: scene.D - back, w: product.width, d: product.depth, rot };
  if (wall === "W") return { x: back, y: along, w: product.width, d: product.depth, rot };
  return { x: scene.W - back, y: along, w: product.width, d: product.depth, rot };
}

/** True when a wall span is clear of doors and windows. */
function wallIsSolid(scene: Scene, wall: Wall, from: number, to: number) {
  return !scene.openings.some((o) => o.wall === wall && o.to > from && o.from < to);
}

function spanOnWall(rect: Rect, wall: Wall) {
  const b = bounds(rect);
  return wall === "N" || wall === "S" ? [b.minX, b.maxX] : [b.minY, b.maxY];
}

/* ------------------------------------------------------- hard constraints */

function violates(rect: Rect, scene: Scene, gap = 0.1): boolean {
  if (!insideRoom(rect, scene.W, scene.D, 0)) return true;
  if (distance([rect.x, rect.y], scene.entry.at) < DOOR_SWING_FT + CLEARANCES.doorSwingBufferFt) return true;
  for (const b of scene.blockers) if (overlaps(rect, b, gap)) return true;
  for (const s of scene.slots) if (overlaps(rect, s.rect, gap)) return true;
  return false;
}

function commit(scene: Scene, product: Product, rect: Rect, rationale: string[], companions: Rect[] = []) {
  scene.slots.push({ rect, product });
  scene.items.push({
    productId: product.id,
    x: round(rect.x),
    y: round(rect.y),
    rotation: ((rect.rot % 360) + 360) % 360,
    fit: verdict(rect, scene, companions),
    rationale
  });
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * How comfortable a committed piece is, given everything already around it.
 * Companions are the pieces it is meant to sit close to, so the walkway rule
 * does not flag a coffee table for being within reach of its own sofa.
 */
function verdict(rect: Rect, scene: Scene, companions: Rect[] = []): FitVerdict {
  if (!insideRoom(rect, scene.W, scene.D, 0)) return "conflict";
  let tight = false;
  for (const other of [...scene.blockers, ...scene.slots.map((s) => s.rect)]) {
    if (other === rect || companions.includes(other)) continue;
    const gap = separation(rect, other);
    if (gap < 0) return "conflict";
    if (gap < CLEARANCES.walkwayFt - 0.9) tight = true;
  }
  return tight ? "tight" : "fits";
}

/**
 * Picks the highest-scoring candidate that breaks no hard rule. Returns null
 * when a piece genuinely has nowhere to go, which the caller reports rather
 * than forcing.
 */
function best(candidates: Rect[], scene: Scene, score: (r: Rect) => number, gap = 0.1): Rect | null {
  let winner: Rect | null = null;
  let top = -Infinity;
  for (const c of candidates) {
    if (violates(c, scene, gap)) continue;
    const s = score(c);
    if (s > top) {
      top = s;
      winner = c;
    }
  }
  return winner;
}

/** Every position along every wall, at half-foot steps. */
function wallCandidates(product: Product, scene: Scene, standoff = 0, walls: Wall[] = ["N", "E", "S", "W"]) {
  const out: Rect[] = [];
  for (const wall of walls) {
    const len = wallLength(wall, scene.W, scene.D);
    const half = product.width / 2;
    for (let along = half; along <= len - half; along += 0.5) {
      out.push(againstWall(wall, along, product, scene, standoff));
    }
  }
  return out;
}

/* ------------------------------------------------------------- feng shui */

/**
 * The command position: the seat sees the entry, but is not in its line of
 * fire, and has something solid behind it.
 */
function commandScore(rect: Rect, scene: Scene) {
  const center: Vec = [rect.x, rect.y];
  const dir = facing(rect.rot);
  const toDoor: Vec = [scene.entry.at[0] - center[0], scene.entry.at[1] - center[1]];
  const sees = dir[0] * toDoor[0] + dir[1] * toDoor[1] > 0;
  const offAxis = lateralOffset(center, dir, scene.entry.at);
  const gapToDoor = distance(center, scene.entry.at);

  let score = 0;
  score += sees ? 4 : -3;
  score += offAxis > 2.5 ? 3 : offAxis > 1.2 ? 1 : -3; // never straight down the door's line
  score += gapToDoor > 5 ? 1.5 : 0; // the mouth of chi stays clear
  return score;
}

/** A solid wall behind a seat reads as support; a window behind it does not. */
function backingScore(rect: Rect, scene: Scene, wall: Wall) {
  const [from, to] = spanOnWall(rect, wall);
  return wallIsSolid(scene, wall, from, to) ? 2.5 : -1.5;
}

/** The far corner diagonally opposite the entry, where a vertical accent lands. */
function baguaCorner(scene: Scene): Vec {
  const [ex, ey] = scene.entry.at;
  return [ex < scene.W / 2 ? scene.W - 1.4 : 1.4, ey < scene.D / 2 ? scene.D - 1.4 : 1.4];
}

/** Which wall a rect is backed against, if any. */
function wallOf(rect: Rect, scene: Scene): Wall | null {
  const b = bounds(rect);
  const eps = 0.6;
  if (b.minY <= eps) return "N";
  if (b.maxY >= scene.D - eps) return "S";
  if (b.minX <= eps) return "W";
  if (b.maxX >= scene.W - eps) return "E";
  return null;
}

/** The wall a piece is looking at. */
function wallFaced(rect: Rect, scene: Scene): Wall {
  const [dx, dy] = facing(rect.rot);
  const options: { wall: Wall; t: number }[] = [];
  if (dy < -0.01) options.push({ wall: "N", t: rect.y / -dy });
  if (dy > 0.01) options.push({ wall: "S", t: (scene.D - rect.y) / dy });
  if (dx < -0.01) options.push({ wall: "W", t: rect.x / -dx });
  if (dx > 0.01) options.push({ wall: "E", t: (scene.W - rect.x) / dx });
  options.sort((a, b) => a.t - b.t);
  return options[0]?.wall ?? "N";
}

/* ------------------------------------------------------------ the passes */

function placePrimary(scene: Scene, product: Product, w: Weights, viewIdeal?: number) {
  // A seat may sit against the wall, or float slightly forward when the room
  // is being arranged around conversation rather than around its perimeter.
  const standoffs = w.gather > 1 ? [0, 0.8, 1.6] : [0];
  const candidates = standoffs.flatMap((s) => wallCandidates(product, scene, s));

  const rect = best(candidates, scene, (r) => {
    const wall = wallOf(r, scene) ?? "N";
    const openFloor = distance([r.x, r.y], [scene.W / 2, scene.D / 2]);
    // With a screen in the set, the seat is chosen partly on whether the wall
    // it looks at lands at a watchable distance.
    const viewFit = viewIdeal ? -Math.abs(throwDistance(r, scene) - viewIdeal) * 0.55 : 0;
    return (
      commandScore(r, scene) * w.fengShui +
      backingScore(r, scene, wall) * w.fengShui +
      (wallLength(wall, scene.W, scene.D) / Math.max(scene.W, scene.D)) * 2 +
      openFloor * 0.35 * w.openness +
      viewFit
    );
  });

  if (!rect) return null;
  commit(scene, product, rect, [
    "Command position: it sees the entry without sitting in its line, with a solid wall behind.",
    "Backed to the longest usable wall so the floor stays open."
  ]);
  return rect;
}

/** How far it is from a piece to the wall it faces. */
function throwDistance(rect: Rect, scene: Scene) {
  const [dx, dy] = facing(rect.rot);
  const options: number[] = [];
  if (dy < -0.01) options.push(rect.y / -dy);
  if (dy > 0.01) options.push((scene.D - rect.y) / dy);
  if (dx < -0.01) options.push(rect.x / -dx);
  if (dx > 0.01) options.push((scene.W - rect.x) / dx);
  return Math.min(...options, Math.max(scene.W, scene.D));
}

function placeTv(scene: Scene, tv: Product, seat: Rect | null, w: Weights) {
  const diagonal = tv.width * TV_DIAGONAL_RATIO;
  const ideal = diagonal * TV_VIEW_MULTIPLE;
  const target: Vec = seat ? [seat.x, seat.y] : [scene.W / 2, scene.D / 2];
  const preferred = seat ? [wallFaced(seat, scene)] : (["N", "E", "S", "W"] as Wall[]);

  const rect = best(wallCandidates(tv, scene, 0, preferred as Wall[]), scene, (r) => {
    const wall = wallOf(r, scene) ?? "N";
    const [from, to] = spanOnWall(r, wall);
    const view = distance([r.x, r.y], target);
    const offAxis = seat ? lateralOffset([seat.x, seat.y], facing(seat.rot), [r.x, r.y]) : 0;
    return (
      -Math.abs(view - ideal) * 1.6 - // sit it at a comfortable viewing distance
      offAxis * 2.2 + // square on to the seat
      (wallIsSolid(scene, wall, from, to) ? 3 : -4) + // a window behind the screen is glare
      w.openness * 0.4
    );
  });

  if (!rect) return null;
  const view = distance([rect.x, rect.y], target);
  commit(scene, tv, rect, [
    `Set ${view.toFixed(1)}′ from the seat, near the ${ideal.toFixed(1)}′ that suits a ${(diagonal * 12).toFixed(0)}″ screen.`,
    "On a solid wall, square to the seating, so the screen is not fighting a window."
  ]);
  return rect;
}

function placeTable(scene: Scene, table: Product, seat: Rect | null) {
  if (!seat) {
    const rect = best([{ x: scene.W / 2, y: scene.D / 2, w: table.width, d: table.depth, rot: 0 }], scene, () => 0);
    if (rect) commit(scene, table, rect, ["Centered in the open floor."]);
    return rect;
  }
  const dir = facing(seat.rot);
  const reach = seat.d / 2 + CLEARANCES.secondaryFt + table.depth / 2;
  const candidates: Rect[] = [];
  for (let step = reach - 0.4; step <= reach + 1.4; step += 0.2) {
    candidates.push({ x: seat.x + dir[0] * step, y: seat.y + dir[1] * step, w: table.width, d: table.depth, rot: seat.rot });
  }
  const rect = best(candidates, scene, (r) => -distance([r.x, r.y], [seat.x + dir[0] * reach, seat.y + dir[1] * reach]));
  if (rect) {
    commit(scene, table, rect, [`About ${(CLEARANCES.secondaryFt * 12).toFixed(0)}″ off the seat front: within reach, still a clear step-through.`], [seat]);
  }
  return rect;
}

function placeRug(scene: Scene, rug: Product, anchors: Rect[]) {
  if (!anchors.length) return null;
  const cx = anchors.reduce((s, r) => s + r.x, 0) / anchors.length;
  const cy = anchors.reduce((s, r) => s + r.y, 0) / anchors.length;
  const candidates: Rect[] = [];
  for (let dx = -1.5; dx <= 1.5; dx += 0.5) {
    for (let dy = -1.5; dy <= 1.5; dy += 0.5) {
      candidates.push({ x: cx + dx, y: cy + dy, w: rug.width, d: rug.depth, rot: 0 });
    }
  }
  // A rug lies under everything, so it only has to stay inside the room.
  const usable = candidates.filter((r) => insideRoom(r, scene.W, scene.D, 0));
  const rect = usable.sort((a, b) => distance([a.x, a.y], [cx, cy]) - distance([b.x, b.y], [cx, cy]))[0] || null;
  if (!rect) return null;
  scene.items.push({
    productId: rug.id,
    x: round(rect.x),
    y: round(rect.y),
    rotation: 0,
    fit: insideRoom(rect, scene.W, scene.D, 0) ? "fits" : "conflict",
    rationale: ["Sized to sit under the front legs of the seating so the group reads as one island."]
  });
  return rect;
}

function placeSeatRing(scene: Scene, chairs: Product[], center: Vec, w: Weights) {
  const radius = Math.min(7.5, CLEARANCES.walkwayFt + 2.4);
  chairs.forEach((chair, i) => {
    const candidates: Rect[] = [];
    for (let a = 0; a < 360; a += 10) {
      for (const r of [radius, radius - 1, radius + 1]) {
        const rad = (a * Math.PI) / 180;
        const x = center[0] + Math.cos(rad) * r;
        const y = center[1] + Math.sin(rad) * r;
        // turned to look back at the middle of the group
        const rot = (Math.atan2(center[1] - y, center[0] - x) * 180) / Math.PI - 90;
        candidates.push({ x, y, w: chair.width, d: chair.depth, rot });
      }
    }
    const rect = best(candidates, scene, (r) => {
      const d = distance([r.x, r.y], center);
      return -Math.abs(d - radius) * 2 * w.gather - distance([r.x, r.y], scene.entry.at) * -0.1;
    });
    if (rect) {
      commit(scene, chair, rect, [
        i === 0
          ? "Closes the conversation ring inside the 8′ where talk stays easy."
          : "Mirrors the opposite seat so the group reads balanced."
      ]);
    } else {
      unplaceable(scene, chair);
    }
  });
}

function placeAgainstFreeWall(scene: Scene, product: Product, note: string, w: Weights) {
  const rect = best(wallCandidates(product, scene), scene, (r) => {
    const wall = wallOf(r, scene) ?? "N";
    const [from, to] = spanOnWall(r, wall);
    return (
      (wallIsSolid(scene, wall, from, to) ? 3 : -2) +
      distance([r.x, r.y], scene.entry.at) * 0.3 * w.fengShui +
      distance([r.x, r.y], [scene.W / 2, scene.D / 2]) * 0.3 * w.openness
    );
  });
  if (rect) commit(scene, product, rect, [note]);
  else unplaceable(scene, product);
  return rect;
}

/**
 * Small accents want a particular corner but will take the nearest free floor
 * to it. Searching outward keeps a lamp or a plant in the room instead of
 * reporting it unplaceable because its first choice was taken.
 */
function placeCornerAccent(scene: Scene, product: Product, target: Vec, note: string) {
  const candidates: Rect[] = [];
  for (let reach = 0; reach <= 6; reach += 0.5) {
    for (let dx = -reach; dx <= reach; dx += 0.5) {
      for (let dy = -reach; dy <= reach; dy += 0.5) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < reach - 0.01) continue; // ring only
        candidates.push({ x: target[0] + dx, y: target[1] + dy, w: product.width, d: product.depth, rot: 0 });
      }
    }
  }
  const rect = best(candidates, scene, (r) => -distance([r.x, r.y], target));
  if (rect) commit(scene, product, rect, [note]);
  else unplaceable(scene, product);
  return rect;
}

/** Hung flat on a wall, centred on a solid span. */
function placeOnWall(scene: Scene, product: Product, wall: Wall, note: string) {
  const len = wallLength(wall, scene.W, scene.D);
  const half = product.width / 2;
  let bestAlong: number | null = null;
  let top = -Infinity;
  for (let along = half; along <= len - half; along += 0.25) {
    if (!wallIsSolid(scene, wall, along - half, along + half)) continue;
    const score = -Math.abs(along - len / 2);
    if (score > top) {
      top = score;
      bestAlong = along;
    }
  }
  if (bestAlong === null) {
    unplaceable(scene, product);
    return null;
  }
  const rect = againstWall(wall, bestAlong, product, scene, 0);
  scene.items.push({ productId: product.id, x: round(rect.x), y: round(rect.y), rotation: rect.rot, fit: "fits", rationale: [note] });
  return rect;
}

function unplaceable(scene: Scene, product: Product) {
  const park = parkSpot(scene, product);
  scene.slots.push({ rect: park, product });
  scene.items.push({
    productId: product.id,
    x: round(park.x),
    y: round(park.y),
    rotation: 0,
    fit: "conflict",
    rationale: ["No clear spot left at this size once the clearances are respected. Swap it smaller or drop it."]
  });
  scene.notes.push(`${product.title} does not fit alongside the rest.`);
}

/**
 * Somewhere to stand a piece that failed placement. It still has to not sit on
 * top of another piece, or the plan shows two flagged items in one spot and the
 * shopper cannot tell which is which.
 */
function parkSpot(scene: Scene, product: Product): Rect {
  const step = 0.5;
  let fallback: Rect | null = null;
  for (let y = product.depth / 2; y <= scene.D - product.depth / 2; y += step) {
    for (let x = product.width / 2; x <= scene.W - product.width / 2; x += step) {
      const rect: Rect = { x, y, w: product.width, d: product.depth, rot: 0 };
      if (!insideRoom(rect, scene.W, scene.D, 0)) continue;
      const clash = [...scene.blockers, ...scene.slots.map((s) => s.rect)].some((other) => overlaps(rect, other, 0.05));
      if (!clash) return rect;
      if (!fallback) fallback = rect;
    }
  }
  return fallback || { x: scene.W / 2, y: scene.D / 2, w: product.width, d: product.depth, rot: 0 };
}

/* ---------------------------------------------------------------- solving */

function solve(room: RoomSpec, products: Product[], detected: DetectedRoom | undefined, w: Weights) {
  const scene = buildScene(room, detected);
  const pick = (c: Category) => products.find((p) => p.category === c);
  const all = (c: Category) => products.filter((p) => p.category === c);

  const primary = pick("bed") || pick("sofa") || pick("desk");
  const screen = pick("tv");
  const viewIdeal = screen ? screen.width * TV_DIAGONAL_RATIO * TV_VIEW_MULTIPLE : undefined;
  const seat = primary ? placePrimary(scene, primary, w, viewIdeal) : null;
  if (primary && !seat) unplaceable(scene, primary);

  if (screen) placeTv(scene, screen, seat, w);

  const table = pick("table");
  const tableRect = table ? placeTable(scene, table, seat) : null;
  if (table && !tableRect) unplaceable(scene, table);

  const groupCenter: Vec = tableRect
    ? [tableRect.x, tableRect.y]
    : seat
      ? [seat.x + facing(seat.rot)[0] * 3, seat.y + facing(seat.rot)[1] * 3]
      : [scene.W / 2, scene.D / 2];

  const chairs = all("chair");
  if (chairs.length) placeSeatRing(scene, chairs, groupCenter, w);

  for (const shelf of all("shelf")) placeAgainstFreeWall(scene, shelf, "Storage lines a solid wall, out of the main walkway.", w);
  for (const dresser of all("dresser")) placeAgainstFreeWall(scene, dresser, "Kept off the entry wall so the room opens as you come in.", w);
  if (!primary || primary.category !== "desk") {
    for (const desk of all("desk")) placeAgainstFreeWall(scene, desk, "Set where the work surface catches daylight from the side.", w);
  }

  for (const stand of all("nightstand")) {
    if (!seat) {
      unplaceable(scene, stand);
      continue;
    }
    const side = facing(seat.rot);
    const perp: Vec = [-side[1], side[0]];
    const reach = seat.w / 2 + stand.width / 2 + 0.2;
    const options: Rect[] = [1, -1].map((s) => ({
      x: seat.x + perp[0] * reach * s,
      y: seat.y + perp[1] * reach * s,
      w: stand.width,
      d: stand.depth,
      rot: seat.rot
    }));
    const rect = best(options, scene, () => 0, 0.05);
    if (rect) commit(scene, stand, rect, ["Flanking the bed at reach height. Even one beats none; two read calmer."], [seat]);
    else unplaceable(scene, stand);
  }

  for (const lamp of all("lamp")) {
    const anchor: Vec = seat ? [seat.x + facing(seat.rot)[1] * 2.6, seat.y - facing(seat.rot)[0] * 2.6] : [1.4, 1.4];
    placeCornerAccent(scene, lamp, anchor, "The third light source, at the corner of the seating rather than overhead.");
  }

  for (const plant of all("plant")) {
    placeCornerAccent(scene, plant, baguaCorner(scene), "The far corner from the entry: a vertical accent that pulls the eye through the room.");
  }

  const rug = pick("rug");
  if (rug) {
    const anchors = [seat, tableRect].filter(Boolean) as Rect[];
    if (!placeRug(scene, rug, anchors.length ? anchors : [{ x: scene.W / 2, y: scene.D / 2, w: 1, d: 1, rot: 0 }])) unplaceable(scene, rug);
  }

  const backWall = seat ? wallOf(seat, scene) : null;
  for (const art of all("art")) {
    placeOnWall(scene, art, backWall ?? "N", "Centred on the wall behind the seating, on a span with no window in it.");
  }
  for (const mirror of all("mirror")) {
    const windowWall = scene.openings.find((o) => o.kind === "window")?.wall;
    const perpendicular: Wall = windowWall === "N" || windowWall === "S" ? "W" : "N";
    placeOnWall(scene, mirror, perpendicular, "Perpendicular to the window, so it returns daylight and reads as a second source.");
  }

  // Anything the passes above did not cover still deserves a spot.
  const handled = new Set(scene.items.map((i) => i.productId));
  for (const rest of products) {
    if (handled.has(rest.id)) continue;
    placeAgainstFreeWall(scene, rest, "Set against a free wall, clear of the walkway.", w);
  }

  // Flat pieces are emitted first so the plan paints them underneath. The
  // solver places the rug late, once it knows what it has to sit beneath.
  const flat = new Set(products.filter((p) => p.category === "rug").map((p) => p.id));
  scene.items.sort((a, b) => Number(flat.has(b.productId)) - Number(flat.has(a.productId)));

  return scene;
}

/** How well a finished arrangement satisfies what it was asked for. */
function rate(scene: Scene, w: Weights) {
  if (!scene.items.length) return 0;
  const conflicts = scene.items.filter((i) => i.fit === "conflict").length;
  const tight = scene.items.filter((i) => i.fit === "tight").length;
  const seat = scene.slots.find((s) => ["sofa", "bed", "desk"].includes(s.product.category));
  const command = seat ? commandScore(seat.rect, scene) : 0;

  const footprint = scene.slots.reduce((sum, s) => sum + s.product.width * s.product.depth, 0);
  const openFloor = 1 - Math.min(1, footprint / (scene.W * scene.D));

  const score =
    0.55 +
    command * 0.02 * w.fengShui +
    openFloor * 0.35 * w.openness -
    conflicts * 0.12 -
    tight * 0.04;
  return Math.max(0.3, Math.min(0.99, score));
}

const VARIANTS: { id: string; name: string; method: string; weights: Weights }[] = [
  { id: "command", name: "Command", method: "Feng shui command position + bagua accents", weights: { fengShui: 1.6, gather: 0.6, openness: 0.8 } },
  { id: "salon", name: "Salon", method: "Conversation ring + intimacy gradient", weights: { fengShui: 0.8, gather: 1.6, openness: 0.7 } },
  { id: "airy", name: "Airy", method: "Open centre + light on two sides", weights: { fengShui: 0.9, gather: 0.5, openness: 1.7 } }
];

export function generateLayouts(room: RoomSpec, products: Product[], detected?: DetectedRoom): LayoutOption[] {
  return VARIANTS.map((v) => {
    const scene = solve(room, products, detected, v.weights);
    return {
      id: v.id,
      name: v.name,
      method: v.method,
      placed: scene.items,
      score: rate(scene, v.weights),
      notes: scene.notes
    };
  });
}

/**
 * Re-seats one piece after the shopper swaps in a different product.
 *
 * The slot the layout chose is the decision worth keeping, so the replacement
 * inherits it: same wall, same facing, same relation to everything else. Only
 * its own size changes, so it is pushed back against its wall at its new depth
 * and re-checked, rather than left on the old centre with a stale verdict.
 */
export function reseat(
  placed: PlacedItem[],
  products: Product[],
  room: RoomSpec,
  detected: DetectedRoom | undefined,
  swappedId: string
): PlacedItem[] {
  const incoming = products.find((p) => p.id === swappedId);
  const current = placed.find((p) => p.productId === swappedId);
  if (!incoming || !current) return placed;

  const scene = buildScene(room, detected);
  for (const item of placed) {
    if (item.productId === swappedId) continue;
    const product = products.find((p) => p.id === item.productId);
    if (product) scene.slots.push({ rect: { x: item.x, y: item.y, w: product.width, d: product.depth, rot: item.rotation }, product });
  }

  const rot = current.rotation;
  const dir = facing(rot);
  // Slide along the piece's own facing so it re-seats against its wall.
  const candidates: Rect[] = [];
  for (let push = -3; push <= 3; push += 0.25) {
    candidates.push({ x: current.x + dir[0] * push, y: current.y + dir[1] * push, w: incoming.width, d: incoming.depth, rot });
  }

  const kept = best(candidates, scene, (r) => -distance([r.x, r.y], [current.x, current.y]));
  const rect = kept || { x: current.x, y: current.y, w: incoming.width, d: incoming.depth, rot };
  const fit = kept ? verdict(rect, scene) : "conflict";

  return placed.map((item) =>
    item.productId === swappedId
      ? {
          ...item,
          x: round(rect.x),
          y: round(rect.y),
          rotation: rot,
          fit,
          rationale: kept
            ? [`Dropped into the same slot at ${incoming.width.toFixed(1)}′ × ${incoming.depth.toFixed(1)}′, re-seated against its wall.`]
            : ["This one does not fit the slot the layout chose. Try a smaller version."]
        }
      : item
  );
}
