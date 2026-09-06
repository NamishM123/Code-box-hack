/**
 * Dimension parsing. A listing without structured dimensions cannot be
 * placed in the room, per the spec: browsing only, Place disabled.
 *
 * Real listings put dimensions in the title, in a spec table, or nowhere.
 * We parse what we can and mark the rest unverified.
 */

export interface Dims { width: number; depth: number; height: number; verified: boolean }

const CATEGORY_FALLBACK: Record<string, [number, number, number]> = {
  sofa: [6.5, 3.2, 2.8],
  chair: [2.6, 2.7, 2.9],
  table: [3.5, 2.0, 1.5],
  bed: [6.5, 8.5, 3.0],
  rug: [8, 10, 0.05],
  lamp: [1.4, 1.4, 5.5],
  shelf: [3.0, 1.2, 5.8],
  plant: [2.4, 2.4, 4.8],
  art: [2.4, 0.1, 3.0],
  desk: [4.0, 2.0, 2.5],
  dresser: [5.0, 1.7, 3.2],
  nightstand: [1.8, 1.5, 2.0],
  mirror: [2.4, 0.2, 6.0]
};

/**
 * Pull "60 x 30 x 34 inches" / 60"D x 30"W x 34"H / 152 x 76 cm out of free text.
 * Returns feet.
 */
export function parseDimensions(text: string, category: string): Dims {
  const t = text.toLowerCase();

  // three numbers separated by x, each optionally tagged with its own
  // w/d/h(/l) label, with an optional unit at the end
  const tagGroup = "(w|width|l|length|d|depth|h|height)?";
  const unitGroup = "(?:\"|''|in\\b|inch(?:es)?\\b|cm\\b)?";
  const triple = t.match(new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${unitGroup}\\s*${tagGroup}\\s*[x×]\\s*` +
    `(\\d+(?:\\.\\d+)?)\\s*${unitGroup}\\s*${tagGroup}\\s*[x×]\\s*` +
    `(\\d+(?:\\.\\d+)?)\\s*${unitGroup}\\s*${tagGroup}\\s*("|''|in\\b|inch(?:es)?\\b|cm\\b|ft\\b|feet\\b)?`
  ));
  if (triple) {
    const nums = [parseFloat(triple[1]), parseFloat(triple[3]), parseFloat(triple[5])];
    const tags = [triple[2], triple[4], triple[6]].map((tag) => normalizeTag(tag));
    const unit = triple[7] || inferUnit(t);
    const feet = nums.map((n) => toFeet(n, unit));
    if (feet.every((f) => f > 0.1 && f < 20)) {
      // Use each number's own w/d/h label where the listing provides one;
      // numbers left unlabelled fall back to the conventional W, D, H order.
      const dims: Partial<Record<"w" | "d" | "h", number>> = {};
      const usedIdx = new Set<number>();
      tags.forEach((tag, i) => {
        if (tag && dims[tag] === undefined) { dims[tag] = feet[i]; usedIdx.add(i); }
      });
      const leftoverIdx = [0, 1, 2].filter((i) => !usedIdx.has(i));
      (["w", "d", "h"] as const).filter((k) => dims[k] === undefined).forEach((k, j) => {
        if (leftoverIdx[j] !== undefined) dims[k] = feet[leftoverIdx[j]];
      });
      return { width: dims.w!, depth: dims.d!, height: dims.h!, verified: true };
    }
  }

  // two numbers, common for rugs: "8 x 10"
  const pair = t.match(/(\d+(?:\.\d+)?)\s*(?:'|ft\b|feet\b)?\s*[x×]\s*(\d+(?:\.\d+)?)\s*('|ft\b|feet\b|"|in\b|inch(?:es)?\b|cm\b)?/);
  if (pair && category === "rug") {
    const unit = pair[3] || "ft";
    const w = toFeet(parseFloat(pair[1]), unit);
    const d = toFeet(parseFloat(pair[2]), unit);
    if (w > 1 && w < 20 && d > 1 && d < 20) return { width: w, depth: d, height: 0.05, verified: true };
  }

  const [w, d, h] = CATEGORY_FALLBACK[category] || [3, 2, 3];
  return { width: w, depth: d, height: h, verified: false };
}

function normalizeTag(tag: string | undefined): "w" | "d" | "h" | undefined {
  if (!tag) return undefined;
  if (tag === "w" || tag === "width" || tag === "l" || tag === "length") return "w";
  if (tag === "d" || tag === "depth") return "d";
  if (tag === "h" || tag === "height") return "h";
  return undefined;
}

function inferUnit(t: string): string {
  if (/\bcm\b|centimet/.test(t)) return "cm";
  if (/\bft\b|feet\b/.test(t)) return "ft";
  return "in";
}

function toFeet(n: number, unit: string): number {
  const u = unit.trim();
  if (u === "cm") return round(n / 30.48);
  if (u === "ft" || u === "feet" || u === "'") return round(n);
  return round(n / 12); // inches, and the default
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** Guess a category from a listing title. */
export function inferCategory(title: string): string {
  const t = title.toLowerCase();
  const rules: [RegExp, string][] = [
    [/\b(sofa|couch|loveseat|sectional|settee)\b/, "sofa"],
    [/\b(nightstand|bedside table)\b/, "nightstand"],
    [/\b(dresser|chest of drawers|bureau)\b/, "dresser"],
    [/\b(desk|writing table|workstation)\b/, "desk"],
    [/\b(bookshelf|bookcase|shelving|shelf|etagere|étagère)\b/, "shelf"],
    [/\b(mirror)\b/, "mirror"],
    [/\b(rug|carpet|runner)\b/, "rug"],
    [/\b(lamp|sconce|lighting|pendant)\b/, "lamp"],
    [/\b(bed frame|bed|headboard|mattress)\b/, "bed"],
    [/\b(plant|tree|fern|monstera|fig)\b/, "plant"],
    [/\b(art|print|painting|poster|canvas|framed)\b/, "art"],
    [/\b(chair|stool|recliner|ottoman|bench)\b/, "chair"],
    [/\b(table|console|credenza|sideboard)\b/, "table"]
  ];
  for (const [re, cat] of rules) if (re.test(t)) return cat;
  return "table";
}

/** Average color of a product image, used for the 2D/3D block color. */
export function guessColor(title: string): string {
  const t = title.toLowerCase();
  const map: [RegExp, string][] = [
    [/\b(walnut|espresso|dark wood)\b/, "#5A3B29"],
    [/\b(oak|natural wood|birch|maple)\b/, "#C9A874"],
    [/\b(white|ivory|cream|bone)\b/, "#EDE4D2"],
    [/\b(black|charcoal|onyx)\b/, "#2A2925"],
    [/\b(grey|gray|slate)\b/, "#8B8B85"],
    [/\b(beige|linen|sand|taupe|greige)\b/, "#D7C9B4"],
    [/\b(green|olive|sage|emerald)\b/, "#5A6B4A"],
    [/\b(blue|navy|teal)\b/, "#3B4C56"],
    [/\b(brown|camel|tan|cognac|leather)\b/, "#B57A4D"],
    [/\b(brass|gold|bronze)\b/, "#C5A15A"],
    [/\b(terracotta|rust|clay|ochre)\b/, "#C98B6B"]
  ];
  for (const [re, c] of map) if (re.test(t)) return c;
  return "#B8B4AA";
}
