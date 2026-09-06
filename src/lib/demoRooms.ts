import { SAMPLE_CATALOG } from "./catalog";
import { listRooms, saveRoom } from "./storage";
import type { PlacedItem, Product } from "./types";

/**
 * Three rooms already in Your Rooms, so the tab is not empty during a demo and
 * the room saved on stage has something to sit beside. Two of them are
 * bedrooms, which is what the inspiration flow produces, so the comparison is
 * like for like.
 *
 * Seeded once, through the same saveRoom the app uses, so they open, delete and
 * behave exactly like a room the shopper saved themselves. Nothing is seeded if
 * rooms already exist, and deleting one keeps it deleted.
 */
const SEEDED_KEY = "sightline:demo-rooms-seeded";

const pick = (ids: string[]): Product[] =>
  ids.map((id) => SAMPLE_CATALOG.find((p) => p.id === id)).filter(Boolean) as Product[];

function lay(products: Product[], spots: [number, number, number][]): PlacedItem[] {
  return products.map((p, i) => ({
    productId: p.id,
    x: spots[i]?.[0] ?? 0,
    y: spots[i]?.[1] ?? 0,
    rotation: spots[i]?.[2] ?? 0,
    fit: "fits" as const,
    rationale: ["Placed for the demo."]
  }));
}

function room(
  id: string,
  name: string,
  layoutName: string,
  roomType: "bedroom" | "living",
  widthFt: number,
  depthFt: number,
  palette: string[],
  ids: string[],
  spots: [number, number, number][]
) {
  const products = pick(ids);
  return {
    id,
    name,
    layoutName,
    spec: {
      widthFt,
      depthFt,
      budget: 4000,
      style: "warm-minimal",
      roomType,
      mustHave: Array.from(new Set(products.map((p) => p.category))),
      vibePalette: palette
    },
    detected: {
      widthFt,
      depthFt,
      confidence: 0.6,
      openings: [{ kind: "window" as const, wall: "W" as const, positionFt: 2, widthFt: 5 }],
      existing: [],
      palette,
      wallColor: palette[0],
      floorColor: palette[1],
      lightingNote: "Daylight from one window."
    },
    productIds: products.map((p) => p.id),
    products,
    placed: lay(products, spots),
    total: products.reduce((s, p) => s + p.price, 0)
  };
}

const DEMO_ROOMS = [
  room("demo-bedroom-oak", "Slatted Oak Bedroom", "As photographed", "bedroom", 15, 13,
    ["#C9BFAE", "#8A5A2B", "#3B2A1E", "#EDE4D2"],
    ["bed-oak-01", "night-oak-01", "rug-wool-01", "lamp-paper-01", "dresser-walnut-01"],
    [[7.5, 3.5, 0], [11.6, 1.2, 0], [7.5, 7, 0], [13.4, 1.8, 0], [2.2, 11.4, 180]]),

  room("demo-bedroom-boucle", "Bouclé Guest Bedroom", "Command", "bedroom", 12, 11,
    ["#EDE4D2", "#A67B4D", "#6B7A5A", "#F3F0E8"],
    ["bed-uphol-01", "mirror-arch-01", "rug-jute-01", "plant-olive-01"],
    [[6, 3.2, 0], [10.8, 8.4, 270], [6, 6.4, 0], [1.6, 9.2, 0]]),

  room("demo-living-travertine", "Travertine Living Room", "Salon", "living", 16, 14,
    ["#E6DDC9", "#6B4A34", "#D7C9B4", "#C5A15A"],
    ["sofa-linen-01", "table-oak-01", "rug-jute-01", "lamp-arc-01", "plant-fiddle-01"],
    [[8, 11.2, 180], [8, 7.4, 0], [8, 8.2, 0], [13.6, 11.8, 180], [2, 2.4, 0]])
];

/** Puts the demo rooms in place the first time Your Rooms is opened. */
export function seedDemoRooms(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, "1");
    if (listRooms().length) return;
    // Reversed so the first one listed above ends up at the top of the page.
    for (const r of [...DEMO_ROOMS].reverse()) saveRoom(r);
  } catch {
    /* storage unavailable: the tab simply starts empty */
  }
}
