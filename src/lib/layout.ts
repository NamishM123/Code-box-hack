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
  /** Floor reserved in front of pieces that have to be reachable. */
  zones: Rect[];
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

/** Unrelated pieces need air between them, not merely no overlap. */
const BREATHING_FT = 0.5;

/**
 * Clear floor a piece needs in front of it to be usable: room to pull a drawer,
 * stand and read a shelf, push a chair back from a desk. Nothing may stand in
 * it. Without this a chair can legally park an inch off a bookshelf, blocking
 * the thing it was bought to hold.
 */
const APPROACH_FT: Partial<Record<Category, number>> = {
  shelf: 2.5,
  dresser: 2.5,
  desk: 3.0,
  nightstand: 1.8
};
const TV_DIAGONAL_RATIO = 1.1478; // 16:9 panel: diagonal from width
// 4K sets are watched closer than the old 1.5-2.5x rule of thumb: roughly 1 to
// 1.5 times the diagonal, so a 65in sits about 5.5-8ft from the seat.
const TV_VIEW_MULTIPLE = 1.25;

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

  return { W, D, openings, entry, blockers, slots: [], zones: [], items: [], notes: [] };
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

/** The strip of floor a piece needs kept clear in front of it. */
function approachZone(rect: Rect, category: Category): Rect | null {
  const depth = APPROACH_FT[category];
  if (!depth) return null;
  const dir = facing(rect.rot);
  const out = rect.d / 2 + depth / 2;
  // A foot wider than the piece: standing at the very edge of a bookshelf still
  // blocks it, and reads as blocking it from most of the room.
  return { x: rect.x + dir[0] * out, y: rect.y + dir[1] * out, w: rect.w + 1.2, d: depth, rot: rect.rot };
}

function violates(rect: Rect, scene: Scene, gap = BREATHING_FT, category?: Category): boolean {
  if (!insideRoom(rect, scene.W, scene.D, 0)) return true;
  if (distance([rect.x, rect.y], scene.entry.at) < DOOR_SWING_FT + CLEARANCES.doorSwingBufferFt) return true;
  for (const b of scene.blockers) if (overlaps(rect, b, gap)) return true;
  for (const s of scene.slots) if (overlaps(rect, s.rect, gap)) return true;
  // never stand in the space something else needs to be reached through
  for (const z of scene.zones) if (overlaps(rect, z, 0)) return true;
  // and whatever this piece needs reaching through must itself be clear
  if (category) {
    const mine = approachZone(rect, category);
    if (mine) {
      for (const b of scene.blockers) if (overlaps(mine, b, 0)) return true;
      for (const s of scene.slots) if (overlaps(mine, s.rect, 0)) return true;
    }
  }
  return false;
}

function commit(scene: Scene, product: Product, rect: Rect, rationale: string[], companions: Rect[] = []) {
  scene.slots.push({ rect, product });
  const zone = approachZone(rect, product.category);
  if (zone) scene.zones.push(zone);
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
function best(candidates: Rect[], scene: Scene, score: (r: Rect) => number, gap = BREATHING_FT, category?: Category): Rect | null {
  let winner: Rect | null = null;
  let top = -Infinity;
  for (const c of candidates) {
    if (violates(c, scene, gap, category)) continue;
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

/**
 * Orientation rules, kept separate from position because a piece can stand in
 * the right spot and still face the wrong way, which is the failure that makes
 * a room read as scattered rather than arranged.
 */

/** Snaps a free angle so pieces look placed rather than dropped. */
function snapAngle(deg: number, step = 5) {
  return Math.round(deg / step) * step;
}

/** How squarely a piece faces a point: 1 dead on, -1 turned away. */
function facesToward(rect: Rect, target: Vec) {
  const dir = facing(rect.rot);
  const to: Vec = [target[0] - rect.x, target[1] - rect.y];
  const len = Math.hypot(to[0], to[1]) || 1;
  return (dir[0] * to[0] + dir[1] * to[1]) / len;
}

/**
 * What the seating should look at. A room wants one thing to be the subject:
 * the screen if there is one, otherwise the daylight, otherwise its own centre.
 */
function focalTarget(scene: Scene, products: Product[]): Vec {
  if (products.some((p) => p.category === "tv")) return [scene.W / 2, scene.D / 2];
  const window = scene.openings.find((o) => o.kind === "window");
  if (window) return alongWall(window.wall, (window.from + window.to) / 2, scene.W, scene.D);
  return [scene.W / 2, scene.D / 2];
}

/**
 * Feng shui's coffin position: a bed whose foot points straight out of the
 * door. Being off the door's line already scores, but a bed aimed down it is
 * the one orientation the tradition treats as worth moving the bed for.
 */
function coffinPenalty(rect: Rect, scene: Scene, isBed: boolean) {
  if (!isBed) return 0;
  const aimedAtDoor = facesToward(rect, scene.entry.at);
  const offAxis = lateralOffset([rect.x, rect.y], facing(rect.rot), scene.entry.at);
  return aimedAtDoor > 0.8 && offAxis < 2.5 ? -8 : 0;
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

function placePrimary(scene: Scene, product: Product, w: Weights, viewIdeal?: number, focal?: Vec) {
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
    // Face the subject of the room, and never point a bed down the doorway.
    const focalFit = focal ? facesToward(r, focal) * 2.2 : 0;
    return (
      commandScore(r, scene) * w.fengShui +
      backingScore(r, scene, wall) * w.fengShui +
      (wallLength(wall, scene.W, scene.D) / Math.max(scene.W, scene.D)) * 2 +
      openFloor * 0.35 * w.openness +
      viewFit +
      focalFit +
      coffinPenalty(r, scene, product.category === "bed") * w.fengShui
    );
  });

  if (!rect) return null;
  commit(scene, product, rect, [
    "Command position: it sees the entry without sitting in its line, with a solid wall behind.",
    product.category === "bed"
      ? "Turned so the foot does not point straight out of the door."
      : "Squared up to the focal point of the room rather than to the nearest wall."
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
  // Squared to the room's own axes, not to whatever angle the seat took, so a
  // rectangular table reads parallel to the walls the way it would be set.
  const rot = snapAngle(seat.rot, 90);
  const candidates: Rect[] = [];
  for (let step = reach - 0.4; step <= reach + 1.4; step += 0.2) {
    candidates.push({ x: seat.x + dir[0] * step, y: seat.y + dir[1] * step, w: table.width, d: table.depth, rot });
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
  // A rug runs with the room: its long side along the room's long axis, or the
  // floor reads as fighting the walls.
  const rugRunsDeep = rug.depth >= rug.width;
  const roomRunsDeep = scene.D >= scene.W;
  const rot = rugRunsDeep === roomRunsDeep ? 0 : 90;
  const candidates: Rect[] = [];
  for (let dx = -1.5; dx <= 1.5; dx += 0.5) {
    for (let dy = -1.5; dy <= 1.5; dy += 0.5) {
      candidates.push({ x: cx + dx, y: cy + dy, w: rug.width, d: rug.depth, rot });
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
    rotation: rect.rot,
    fit: insideRoom(rect, scene.W, scene.D, 0) ? "fits" : "conflict",
    rationale: ["Sized to sit under the front legs of the seating so the group reads as one island."]
  });
  return rect;
}

/**
 * Where the other seats go.
 *
 * With a focal point, every seat has to address it. The sofa takes the base and
 * the chairs flank the axis running from it to the screen, turned to face the
 * screen too: the L or U that every arrangement guide describes. Facing them at
 * the middle of the group instead, which is what this did, leaves a chair
 * staring at the sofa's flank while the sofa watches something else, and the
 * room reads as pieces that happened to land near each other.
 *
 * With no focal point there is nothing to address, and a conversation ring
 * facing the middle is the right answer.
 */
function placeSeating(scene: Scene, chairs: Product[], seat: Rect | null, focal: Vec | null, center: Vec, w: Weights) {
  const addressing = Boolean(seat && focal);

  chairs.forEach((chair, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const candidates: Rect[] = [];

    if (addressing && seat && focal) {
      const axis: Vec = [focal[0] - seat.x, focal[1] - seat.y];
      const len = Math.hypot(axis[0], axis[1]) || 1;
      const unit: Vec = [axis[0] / len, axis[1] / len];
      const perp: Vec = [-unit[1], unit[0]];

      // out along the axis, off to one side: the arms of the U
      for (let forward = 1; forward <= len * 0.7; forward += 0.5) {
        for (let out = 2.5; out <= 7; out += 0.5) {
          const x = seat.x + unit[0] * forward + perp[0] * out * side;
          const y = seat.y + unit[1] * forward + perp[1] * out * side;
          const rot = snapAngle((Math.atan2(focal[1] - y, focal[0] - x) * 180) / Math.PI - 90);
          candidates.push({ x, y, w: chair.width, d: chair.depth, rot });
        }
      }
    } else {
      const radius = Math.min(7.5, CLEARANCES.walkwayFt + 2.4);
      for (let a = 0; a < 360; a += 10) {
        for (const r of [radius, radius - 1, radius + 1]) {
          const rad = (a * Math.PI) / 180;
          const x = center[0] + Math.cos(rad) * r;
          const y = center[1] + Math.sin(rad) * r;
          const rot = snapAngle((Math.atan2(center[1] - y, center[0] - x) * 180) / Math.PI - 90);
          candidates.push({ x, y, w: chair.width, d: chair.depth, rot });
        }
      }
    }

    const rect = best(candidates, scene, (r) => {
      if (addressing && seat && focal) {
        const axis: Vec = [focal[0] - seat.x, focal[1] - seat.y];
        const blocking = lateralOffset([seat.x, seat.y], axis, [r.x, r.y]);
        const view = distance([r.x, r.y], focal);
        const fromSeat = distance([r.x, r.y], [seat.x, seat.y]);
        return (
          blocking * 1.4 - // stay out of the sofa's own sightline
          Math.abs(view - distance([seat.x, seat.y], focal)) * 0.8 - // level with the sofa, not miles behind it
          // an arm of the group, set off the sofa rather than shoved against it
          Math.abs(fromSeat - 5) * 1.1
        );
      }
      const d = distance([r.x, r.y], center);
      return -Math.abs(d - Math.min(7.5, CLEARANCES.walkwayFt + 2.4)) * 2 * w.gather;
    });

    if (rect) {
      commit(scene, chair, rect, [
        addressing
          ? "Set on the arm of the group, turned to the same focal point as the sofa rather than at the sofa itself."
          : "Closes the conversation ring inside the 8′ where talk stays easy."
      ]);
    } else {
      unplaceable(scene, chair);
    }
  });
}

function placeAgainstFreeWall(scene: Scene, product: Product, note: string, w: Weights) {
  const rect = best(
    wallCandidates(product, scene),
    scene,
    (r) => {
    const wall = wallOf(r, scene) ?? "N";
    const [from, to] = spanOnWall(r, wall);
    return (
      (wallIsSolid(scene, wall, from, to) ? 3 : -2) +
      distance([r.x, r.y], scene.entry.at) * 0.3 * w.fengShui +
      distance([r.x, r.y], [scene.W / 2, scene.D / 2]) * 0.3 * w.openness
    );
    },
    BREATHING_FT,
    product.category
  );
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
  const focal = focalTarget(scene, products);
  const seat = primary ? placePrimary(scene, primary, w, viewIdeal, focal) : null;
  if (primary && !seat) unplaceable(scene, primary);

  const screenRect = screen ? placeTv(scene, screen, seat, w) : null;

  const table = pick("table");
  const tableRect = table ? placeTable(scene, table, seat) : null;
  if (table && !tableRect) unplaceable(scene, table);

  const groupCenter: Vec = tableRect
    ? [tableRect.x, tableRect.y]
    : seat
      ? [seat.x + facing(seat.rot)[0] * 3, seat.y + facing(seat.rot)[1] * 3]
      : [scene.W / 2, scene.D / 2];

  // Storage goes before the loose seating. It has to be on a wall and it has to
  // be reachable, so it claims its span and its approach first; a chair can go
  // almost anywhere and should be the one that yields.
  for (const shelf of all("shelf")) placeAgainstFreeWall(scene, shelf, "Storage lines a solid wall, with the floor in front of it left clear to reach.", w);
  for (const dresser of all("dresser")) placeAgainstFreeWall(scene, dresser, "Kept off the entry wall, with drawer room left in front.", w);
  if (!primary || primary.category !== "desk") {
    for (const desk of all("desk")) placeAgainstFreeWall(scene, desk, "Set where the work surface catches daylight from the side, with room to push a chair back.", w);
  }

  // Once the screen is on a wall it, not the coffee table, is what the seats
  // address.
  const addressed: Vec | null = screenRect ? [screenRect.x, screenRect.y] : null;
  const chairs = all("chair");
  if (chairs.length) placeSeating(scene, chairs, seat, addressed, groupCenter, w);

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

/**
 * Where each piece stood in the inspiration photograph, in that photograph's
 * own plan. Positions are the model's perception; whether they are legal in
 * this room stays this file's decision.
 */
export interface ReferencePlan {
  /** The plan the coordinates below are expressed in, in feet. */
  refW: number;
  refD: number;
  items: {
    productId: string;
    x: number;
    y: number;
    backsTo?: Wall | "none";
  }[];
}

export function generateLayouts(
  room: RoomSpec,
  products: Product[],
  detected?: DetectedRoom,
  reference?: ReferencePlan
): LayoutOption[] {
  const solved = VARIANTS.map((v) => {
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

  // A layout copied off the photograph leads, when there is one to copy.
  if (reference?.items?.length) {
    const scene = solveFromReference(room, products, detected, reference);
    solved.unshift({
      id: "asphotographed",
      name: "As photographed",
      method: "Each piece where it stood in the picture",
      placed: scene.items,
      score: rate(scene, { fengShui: 1, gather: 1, openness: 1 }),
      notes: scene.notes
    });
  }

  return solved;
}

/**
 * Rebuilds the photograph's arrangement in this room.
 *
 * The picture says where things go; this file still says whether they may.
 * Every candidate goes through the same `violates` gate as any other layout —
 * inside the room, clear of the door swing, off other pieces and out of their
 * approach zones — so a copied plan can never produce a fit verdict the
 * shopper cannot trust. What the reference changes is only which legal spot
 * gets chosen: the one nearest where the piece stood in the photo.
 *
 * Bigger pieces are seated first. A bed that loses its corner to a lamp is a
 * plan that no longer resembles anything.
 */
function solveFromReference(
  room: RoomSpec,
  products: Product[],
  detected: DetectedRoom | undefined,
  ref: ReferencePlan
) {
  const scene = buildScene(room, detected);

  // The photo's room and the shopper's room are rarely the same size, so
  // positions are carried across as proportions of each axis rather than as
  // absolute feet.
  const sx = scene.W / Math.max(1, ref.refW);
  const sy = scene.D / Math.max(1, ref.refD);

  const byId = new Map(ref.items.map((i) => [i.productId, i]));
  const ordered = [...products].sort((a, b) => b.width * b.depth - a.width * a.depth);

  for (const product of ordered) {
    const hint = byId.get(product.id);
    const target: Vec = hint
      ? [clampTo(hint.x * sx, 0, scene.W), clampTo(hint.y * sy, 0, scene.D)]
      : [scene.W / 2, scene.D / 2];

    const wall = hint?.backsTo && hint.backsTo !== "none" ? (hint.backsTo as Wall) : null;
    const rot = wall ? FACE_INWARD[wall] : snapAngle(facesToward({ x: target[0], y: target[1], w: product.width, d: product.depth, rot: 0 }, [scene.W / 2, scene.D / 2]), 90);

    const candidates = referenceCandidates(target, rot, product, scene, wall);
    const nearest = (r: Rect) => -distance([r.x, r.y], target);

    // Full clearances first.
    let spot = best(candidates, scene, nearest, BREATHING_FT, product.category);
    let snug = false;

    if (!spot) {
      // Some pieces belong hard against another and are not reached "through"
      // it — a nightstand at the head of a bed is the standard case, and
      // solve() seats exactly that at a 0.05ft gap with no approach zone. A
      // photograph is full of them, so retry on those terms before declaring
      // the piece homeless. Still every other hard rule: inside the room, off
      // the door swing, out of anyone else's approach zone.
      spot = best(candidates, scene, nearest, 0.05);
      snug = true;
    }

    if (!spot) {
      unplaceable(scene, product);
      continue;
    }

    // Whatever it ended up touching is what it was meant to touch, so the fit
    // verdict shouldn't read that closeness as a pinched walkway.
    const companions = snug ? touching(spot, scene) : [];

    const drift = distance([spot.x, spot.y], target);
    const note = wall
      ? `Against the ${wall} wall, where it sits in the picture.`
      : "Placed where it stands in the picture.";
    commit(
      scene,
      product,
      spot,
      [
        drift < 0.75
          ? note
          : `${note} Moved ${drift.toFixed(1)}ft to clear the room's own walls and walkways.`
      ],
      companions
    );
  }

  if (!ref.items.length) scene.notes.push("Nothing in the picture could be located, so this is the open-plan fallback.");
  return scene;
}

/**
 * Spots to try for a piece, nearest its photographed position first: the exact
 * point, then flush along its wall if it had one, then rings outward. Rotation
 * is kept — which way a piece faces is most of what makes a room read like the
 * photo — so a piece that cannot fit facing that way is reported rather than
 * quietly spun around.
 */
function referenceCandidates(target: Vec, rot: number, product: Product, scene: Scene, wall: Wall | null): Rect[] {
  const out: Rect[] = [
    { x: target[0], y: target[1], w: product.width, d: product.depth, rot }
  ];

  if (wall) {
    // The whole wall, nearest the photographed spot first. A piece that has
    // its back to a wall in the picture should keep it even if that means
    // sliding well along it.
    const along = wall === "N" || wall === "S" ? target[0] : target[1];
    const len = wallLength(wall, scene.W, scene.D);
    for (let slide = 0; slide <= len; slide += 0.5) {
      for (const dir of slide === 0 ? [1] : [-1, 1]) {
        const at = along + dir * slide;
        if (at < product.width / 2 || at > len - product.width / 2) continue;
        out.push(againstWall(wall, at, product, scene));
      }
    }
  }

  const reach = Math.max(scene.W, scene.D);
  for (let radius = 0.5; radius <= reach; radius += 0.5) {
    for (let deg = 0; deg < 360; deg += 30) {
      const a = (deg * Math.PI) / 180;
      out.push({
        x: target[0] + Math.cos(a) * radius,
        y: target[1] + Math.sin(a) * radius,
        w: product.width,
        d: product.depth,
        rot
      });
    }
  }

  return out;
}

/** Pieces already in the scene that this one ends up right up against. */
function touching(rect: Rect, scene: Scene): Rect[] {
  return scene.slots.map((s) => s.rect).filter((other) => separation(rect, other) < CLEARANCES.walkwayFt);
}

function clampTo(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Re-seats one piece after the shopper swaps in a different product.
 *
 * The slot the layout chose is the decision worth keeping, so the replacement
 * inherits it: same wall, same facing, same relation to everything else. Only
 * its own size changes, so it is pushed back against its wall at its new depth
 * and re-checked, rather than left on the old centre with a stale verdict.
 */
/**
 * Seats one product in the slot another currently holds.
 *
 * The slot the layout chose is the decision worth keeping, so a replacement
 * inherits it: same wall, same facing, same relation to everything else. Only
 * its own size changes, so it is pushed back against its wall at its new depth
 * and re-checked, rather than left on the old centre with a stale verdict.
 */
function seatInSlot(
  placed: PlacedItem[],
  products: Product[],
  room: RoomSpec,
  detected: DetectedRoom | undefined,
  slotId: string,
  incoming: Product
): { rect: Rect; fit: FitVerdict } | null {
  const current = placed.find((p) => p.productId === slotId);
  if (!current) return null;

  const scene = buildScene(room, detected);

  // A rug lies under the furniture and a screen or a frame hangs above it, so
  // neither collides with anything on the floor. Only the room's own walls
  // constrain them.
  const underfootOrMounted = ["rug", "art", "tv", "mirror"].includes(incoming.category);
  if (underfootOrMounted) {
    const rect: Rect = { x: current.x, y: current.y, w: incoming.width, d: incoming.depth, rot: current.rotation };
    return { rect, fit: insideRoom(rect, room.widthFt, room.depthFt, 0) ? "fits" : "conflict" };
  }
  for (const item of placed) {
    if (item.productId === slotId) continue;
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
  if (!kept) return null;
  return { rect: kept, fit: verdict(kept, scene) };
}

/** Whether a candidate could take a slot, for showing before the shopper commits. */
export function previewFit(
  placed: PlacedItem[],
  products: Product[],
  room: RoomSpec,
  detected: DetectedRoom | undefined,
  slotId: string,
  candidate: Product
): FitVerdict {
  return seatInSlot(placed, products, room, detected, slotId, candidate)?.fit ?? "conflict";
}

/** Re-seats one piece after the shopper swaps in a different product. */
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

  const seated = seatInSlot(placed, products, room, detected, swappedId, incoming);

  return placed.map((item) =>
    item.productId === swappedId
      ? {
          ...item,
          x: round(seated ? seated.rect.x : current.x),
          y: round(seated ? seated.rect.y : current.y),
          rotation: current.rotation,
          fit: seated ? seated.fit : "conflict",
          rationale: seated
            ? [`Dropped into the same slot at ${incoming.width.toFixed(1)}′ × ${incoming.depth.toFixed(1)}′, re-seated against its wall.`]
            : ["This one does not fit the slot the layout chose. Try a smaller version."]
        }
      : item
  );
}
