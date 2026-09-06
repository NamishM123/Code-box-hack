/**
 * Plan-space geometry, in feet.
 *
 * Coordinates match the 2D plan: x runs left to right, y runs from the far wall
 * toward the viewer, and rotation is clockwise in degrees, the same value the
 * top view applies with a CSS transform. A piece's front faces local +y when
 * unrotated, so a piece against the far (north) wall at rotation 0 faces into
 * the room.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  d: number;
  rot: number;
}

export type Vec = [number, number];

/** Rotation applied to a vector in the piece's local frame. */
export function rotate([x, y]: Vec, deg: number): Vec {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

/** The direction a piece faces: local +y turned by its rotation. */
export function facing(rot: number): Vec {
  return rotate([0, 1], rot);
}

export function corners(r: Rect): Vec[] {
  const hw = r.w / 2;
  const hd = r.d / 2;
  return ([
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd]
  ] as Vec[]).map((c) => {
    const [dx, dy] = rotate(c, r.rot);
    return [r.x + dx, r.y + dy] as Vec;
  });
}

/** Axis-aligned bounds of a rotated rect. */
export function bounds(r: Rect) {
  const pts = corners(r);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function project(pts: Vec[], axis: Vec) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of pts) {
    const v = p[0] * axis[0] + p[1] * axis[1];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/**
 * Separating-axis overlap between two oriented rectangles, with an optional
 * gap that both must respect. The old check compared unrotated footprints,
 * which reported a rotated bookshelf as colliding with a wall it cleared.
 */
export function overlaps(a: Rect, b: Rect, gap = 0): boolean {
  const pa = corners(a);
  const pb = corners(b);
  for (const rot of [a.rot, b.rot]) {
    for (const axis of [rotate([1, 0], rot), rotate([0, 1], rot)] as Vec[]) {
      const A = project(pa, axis);
      const B = project(pb, axis);
      if (A.max + gap <= B.min || B.max + gap <= A.min) return false;
    }
  }
  return true;
}

/**
 * Clearance between two rects: the widest gap found on any of their axes.
 * Positive means that axis separates them, so the pieces are that far apart;
 * negative means every axis overlaps, so they intersect.
 */
export function separation(a: Rect, b: Rect): number {
  let widest = -Infinity;
  for (const rot of [a.rot, b.rot]) {
    for (const axis of [rotate([1, 0], rot), rotate([0, 1], rot)] as Vec[]) {
      const A = project(corners(a), axis);
      const B = project(corners(b), axis);
      const gap = Math.max(B.min - A.max, A.min - B.max);
      if (gap > widest) widest = gap;
    }
  }
  return widest;
}

/** True when the whole footprint sits inside a room of this size. */
export function insideRoom(r: Rect, widthFt: number, depthFt: number, margin = 0): boolean {
  const b = bounds(r);
  const eps = 1e-6;
  return (
    b.minX >= margin - eps && b.minY >= margin - eps && b.maxX <= widthFt - margin + eps && b.maxY <= depthFt - margin + eps
  );
}

export function distance(a: Vec, b: Vec) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** How far a point sits to the side of the line a ray traces from `from`. */
export function lateralOffset(from: Vec, dir: Vec, point: Vec) {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const nx = -dir[1] / len;
  const ny = dir[0] / len;
  return Math.abs((point[0] - from[0]) * nx + (point[1] - from[1]) * ny);
}
