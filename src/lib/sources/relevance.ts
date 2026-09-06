import type { Category } from "../types";

/**
 * Cheap listings that are not the thing you searched for.
 *
 * A price floor alone does not clean up the bottom of a band: search
 * "warm minimal sofa" and Google Shopping happily returns a $38
 * slipcover, a $22 set of replacement legs, and a $14 dollhouse couch,
 * all of them technically sofa results. They anchor the low end of the
 * range and crowd out the listings the budget was meant to buy.
 */

const UNIVERSAL = [
  "dollhouse", "doll house", "miniature", "1:12", "1/12 scale", "for barbie",
  "replacement part", "replacement leg", "spare part", "hardware kit",
  "cover only", "frame only", "legs only", "parts only",
  "sticker", "decal", "wall cling", "coloring book", "gift card"
];

const PER_CATEGORY: Partial<Record<Category, string[]>> = {
  sofa: ["slipcover", "slip cover", "sofa cover", "couch cover", "cushion cover", "arm tray", "arm rest organizer", "pet sofa", "dog sofa", "sofa protector"],
  chair: ["chair cover", "chair pad", "chair mat", "chair cushion", "seat cushion", "chair leg", "chair glide", "high chair", "beach chair", "folding camp"],
  table: ["tablecloth", "table cloth", "table runner", "table pad", "table protector", "table leg", "table topper", "placemat"],
  bed: ["bedding", "bed sheet", "sheet set", "duvet", "comforter", "mattress protector", "mattress topper", "bed skirt", "bed rail", "bed slat", "pet bed", "dog bed", "air mattress"],
  desk: ["desk pad", "desk mat", "desk organizer", "desk topper", "desk riser", "desk cover"],
  dresser: ["drawer liner", "drawer organizer", "drawer knob", "drawer pull", "dresser scarf"],
  nightstand: ["nightstand organizer", "nightstand caddy", "bedside caddy"],
  shelf: ["shelf liner", "shelf bracket", "shelf pin", "shelf paper", "shelf divider"],
  rug: ["rug pad", "rug gripper", "rug tape", "rug underlay", "rug doctor", "carpet cleaner"],
  lamp: ["light bulb", "lamp shade", "lampshade", "shade only", "lamp cord", "lamp harp", "lamp finial", "bulb only"],
  mirror: ["mirror film", "mirror adhesive", "mirror clip", "mirror defogger", "makeup mirror", "compact mirror"],
  art: ["frame only", "picture hanging", "hanging strip", "canvas blank", "art supplies", "paint set"],
  plant: ["plant food", "fertilizer", "plant seeds", "seed packet", "grow light", "plant hanger", "watering can", "pot only", "planter only"]
};

/** Terms meaning the listing is really a different category than the one searched. */
const MISLABELLED: Partial<Record<Category, string[]>> = {
  sofa: ["sofa table", "sofa lamp", "sofa shelf"],
  desk: ["desk lamp", "desk chair", "desk clock"],
  bed: ["bed tray", "bed lamp"],
  table: ["table lamp"],
  chair: ["chair rail"]
};

/**
 * True when the listing is an accessory, a part, or a toy rather than the
 * piece of furniture the category asked for.
 */
export function isAccessoryListing(title: string, category: Category): boolean {
  const t = (title || "").toLowerCase();
  if (!t) return true;

  for (const term of UNIVERSAL) if (t.includes(term)) return true;
  for (const term of PER_CATEGORY[category] || []) if (t.includes(term)) return true;
  for (const term of MISLABELLED[category] || []) if (t.includes(term)) return true;

  // "set of 4 knobs", "pack of 12" — furniture is not sold by the dozen.
  if (/\b(?:set|pack|lot)\s+of\s+(\d+)\b/.test(t)) {
    const n = Number(t.match(/\b(?:set|pack|lot)\s+of\s+(\d+)\b/)![1]);
    if (n >= 6) return true;
  }

  return false;
}
