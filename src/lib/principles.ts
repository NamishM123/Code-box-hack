/**
 * Layout principles distilled from architectural + spatial design literature
 * (Ching's Form/Space/Order, Alexander's A Pattern Language, Christopher Alexander's
 * "Intimacy Gradient" and "Light on Two Sides", classical feng shui bagua,
 * and standard ergonomic clearances from Neufert / Human Dimension & Interior Space).
 *
 * These aren't quoted — they're rules of thumb encoded as functions and constants.
 */

export const CLEARANCES = {
  walkwayFt: 3.0,          // Neufert primary circulation
  secondaryFt: 1.8,        // between chair and coffee table
  bedSideFt: 1.6,          // bed to wall / other furniture
  desksitFt: 3.0,          // desk chair pull-out
  doorSwingBufferFt: 0.6   // beyond door swing radius
};

export interface Principle {
  key: string;
  tradition: "feng-shui" | "ergonomic" | "compositional" | "phenomenological";
  title: string;
  body: string;
}

export const PRINCIPLES: Principle[] = [
  {
    key: "command-position",
    tradition: "feng-shui",
    title: "Command position",
    body: "The bed, desk, or primary seat should see the door without being directly in line with it. It reads as safety and lets attention settle."
  },
  {
    key: "mouth-of-chi",
    tradition: "feng-shui",
    title: "Keep the mouth of chi clear",
    body: "The entry area should stay uncluttered. Nothing tall or heavy within one full stride of the door."
  },
  {
    key: "yin-yang-balance",
    tradition: "feng-shui",
    title: "Yin and yang balance",
    body: "Pair heavy with light, soft with hard, matte with reflective. A room made only of one register feels either loud or dead."
  },
  {
    key: "bagua-wealth",
    tradition: "feng-shui",
    title: "Bagua accents",
    body: "The far-left corner from the entry rewards a plant, lamp, or vertical object. It anchors the far side of the room and pulls the eye through."
  },
  {
    key: "light-two-sides",
    tradition: "phenomenological",
    title: "Light on two sides",
    body: "A room feels alive when daylight enters from two directions. If only one window exists, place a mirror on the perpendicular wall to fake the second source."
  },
  {
    key: "intimacy-gradient",
    tradition: "compositional",
    title: "Intimacy gradient",
    body: "Public zones (entry, seating) sit closer to the door. Private zones (bed, desk) live deeper into the room."
  },
  {
    key: "conversation-radius",
    tradition: "ergonomic",
    title: "Conversation radius",
    body: "Seating grouped inside an 8ft diameter reads as one room. Beyond that, people raise their voice and the room feels vacant."
  },
  {
    key: "rug-anchors",
    tradition: "compositional",
    title: "The rug anchors the group",
    body: "At least the front legs of every seat should touch the rug. A rug too small orphans the furniture from the floor."
  },
  {
    key: "verticality",
    tradition: "compositional",
    title: "One tall thing per zone",
    body: "Every zone needs a vertical accent — a shelf, a plant, a lamp — to keep the eye from falling."
  },
  {
    key: "triangulation",
    tradition: "compositional",
    title: "Triangulate the eye",
    body: "Group focal objects in threes at varying heights. The eye reads a triangle as composition; a straight line reads as inventory."
  },
  {
    key: "walkway",
    tradition: "ergonomic",
    title: "Protect the walkway",
    body: "Primary paths need 3 ft of clearance. Anything narrower forces a shuffle and the room stops being restful."
  },
  {
    key: "door-swing",
    tradition: "ergonomic",
    title: "Honor the door swing",
    body: "No furniture within the arc of a door plus one hand-width. This is the most common invisible mistake."
  }
];

export type StylePreset = {
  key: string;
  label: string;
  palette: string[];
  vibe: string[];
  materials: string[];
  notes: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  { key: "warm-minimal", label: "Warm Minimal", palette: ["#E9E0D2", "#C89F5A", "#2A2925", "#8A6A48"], vibe: ["quiet", "warm", "editorial"], materials: ["oak", "linen", "travertine"], notes: "Restrained palette, one warm accent, natural materials." },
  { key: "japandi", label: "Japandi", palette: ["#F3F0E8", "#C9A874", "#3A342C", "#6B7A6E"], vibe: ["calm", "spare", "grounded"], materials: ["oak", "paper", "bouclé"], notes: "Low silhouettes, negative space, tactile matte surfaces." },
  { key: "boho", label: "Warm Boho", palette: ["#C98B6B", "#5A6B4A", "#E6DDC9", "#8B3A2E"], vibe: ["layered", "eclectic", "earthy"], materials: ["jute", "rattan", "clay"], notes: "Layered textiles, plants at multiple heights, warm terracotta." },
  { key: "scandi", label: "Scandi", palette: ["#F3F0E8", "#A3B1A1", "#0B0B0F", "#C9A874"], vibe: ["airy", "functional", "bright"], materials: ["birch", "wool", "steel"], notes: "White walls, blonde wood, one moody accent." },
  { key: "moody-classic", label: "Moody Classic", palette: ["#2A2925", "#8B3A2E", "#C89F5A", "#B8B4AA"], vibe: ["intimate", "collected", "rich"], materials: ["walnut", "velvet", "brass"], notes: "Deep walls, layered lighting, brass and glass hardware." },
  { key: "coastal", label: "Coastal Calm", palette: ["#EEF3F5", "#A9C0C7", "#D6C39A", "#3B4C56"], vibe: ["soft", "breezy", "bright"], materials: ["linen", "raw wood", "ceramic"], notes: "Whitewashed woods, soft blues, generous linen." }
];

export function styleForVibe(vibe: string[] | undefined, palette?: string[]): StylePreset {
  if (!vibe?.length) return STYLE_PRESETS[0];
  let best = STYLE_PRESETS[0];
  let bestHits = -1;
  for (const s of STYLE_PRESETS) {
    const hits = vibe.filter((v) => s.vibe.some((sv) => sv.toLowerCase() === v.toLowerCase())).length;
    if (hits > bestHits) { best = s; bestHits = hits; }
  }
  if (palette?.length) return { ...best, palette };
  return best;
}
