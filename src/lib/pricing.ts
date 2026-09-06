import type { Category } from "./types";

/**
 * Per-category price bands.
 *
 * Splitting a room budget evenly across the mix is what makes the price
 * range read as broken. On a $2,500 eight-piece living room every slot
 * gets $312: the sofa search is capped below what any real sofa costs,
 * so it comes back full of slipcovers and replacement legs, while the
 * plant search is handed enough money to return a six-foot ficus.
 *
 * These weights are the share of a room budget each category actually
 * takes, and the floors and ceilings are the range a real listing for
 * that category lives in regardless of budget.
 */

/** Relative share of the budget, normalized across whichever mix is asked for. */
const WEIGHT: Record<Category, number> = {
  sofa: 30,
  bed: 26,
  dresser: 14,
  desk: 14,
  table: 12,
  chair: 10,
  shelf: 10,
  rug: 9,
  mirror: 6,
  nightstand: 6,
  art: 5,
  lamp: 5,
  plant: 3
};

/** Under this, a listing for the category is a part, a cover, or a toy. */
const FLOOR: Record<Category, number> = {
  sofa: 180,
  bed: 140,
  dresser: 90,
  desk: 60,
  table: 45,
  chair: 40,
  shelf: 40,
  rug: 30,
  mirror: 25,
  nightstand: 30,
  art: 15,
  lamp: 18,
  plant: 12
};

/** Over this, a listing is a showroom piece the budget slider never reaches. */
const CEILING: Record<Category, number> = {
  sofa: 6000,
  bed: 5000,
  dresser: 3000,
  desk: 2500,
  table: 2500,
  chair: 2000,
  shelf: 2000,
  rug: 2500,
  mirror: 1200,
  nightstand: 900,
  art: 1200,
  lamp: 800,
  plant: 500
};

export interface PriceBand {
  /** What this category should cost in this budget. */
  target: number;
  /** Tight band used for scoring and selection. */
  min: number;
  max: number;
  /** Wider band sent to the search APIs, so a starved category has somewhere to widen to. */
  fetchMin: number;
  fetchMax: number;
}

const DEFAULT_WEIGHT = 8;
const DEFAULT_FLOOR = 20;
const DEFAULT_CEILING = 2000;

const weightOf = (c: Category) => WEIGHT[c] ?? DEFAULT_WEIGHT;
export const floorOf = (c: Category) => FLOOR[c] ?? DEFAULT_FLOOR;
export const ceilingOf = (c: Category) => CEILING[c] ?? DEFAULT_CEILING;

/**
 * Give every category in the mix its own slice of the budget and a band
 * around it. Slices are weighted, then clamped to what the category can
 * actually cost, then the clamping error is pushed back onto the
 * unclamped categories so the slices still add up to the budget.
 */
export function allocateBudget(categories: Category[], budget: number): Map<Category, PriceBand> {
  const mix = Array.from(new Set(categories));
  const bands = new Map<Category, PriceBand>();
  if (!mix.length) return bands;

  const targets = new Map<Category, number>();
  const pinned = new Set<Category>();

  // Weighted split, then up to a few passes redistributing whatever the
  // floors and ceilings forced us to add or give back.
  for (let pass = 0; pass < 4; pass++) {
    const free = mix.filter((c) => !pinned.has(c));
    if (!free.length) break;

    const spentOnPinned = mix
      .filter((c) => pinned.has(c))
      .reduce((s, c) => s + (targets.get(c) || 0), 0);
    const pool = Math.max(0, budget - spentOnPinned);
    const totalWeight = free.reduce((s, c) => s + weightOf(c), 0) || 1;

    let clampedAny = false;
    for (const c of free) {
      const raw = (pool * weightOf(c)) / totalWeight;
      const clamped = Math.min(ceilingOf(c), Math.max(floorOf(c), raw));
      targets.set(c, clamped);
      if (Math.abs(clamped - raw) > 0.5) { pinned.add(c); clampedAny = true; }
    }
    if (!clampedAny) break;
  }

  for (const c of mix) {
    const target = Math.round(targets.get(c) ?? floorOf(c));
    const floor = floorOf(c);
    const ceiling = ceilingOf(c);

    const min = Math.round(Math.max(floor, Math.min(target * 0.4, target)));
    const max = Math.round(Math.min(ceiling, Math.max(target * 2.2, min * 1.5)));

    bands.set(c, {
      target,
      min,
      max,
      // The fetch band is deliberately wider than the scoring band: the
      // search APIs filter server-side, so anything outside what we ask
      // for never comes back and a starved category has nothing to widen
      // into.
      fetchMin: Math.round(Math.max(floor * 0.75, min * 0.6)),
      fetchMax: Math.round(Math.min(ceiling * 1.5, max * 1.6))
    });
  }

  return bands;
}

/** A price that is impossible for the category, whatever the budget. */
export function isPlausiblePrice(category: Category, price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  return price >= floorOf(category) * 0.5 && price <= ceilingOf(category) * 3;
}
