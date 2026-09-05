import type { PlacedItem, Product, RoomSpec } from "./types";

export function autoLayout(room: RoomSpec, products: Product[]): PlacedItem[] {
  const W = room.widthFt;
  const D = room.depthFt;
  const placed: PlacedItem[] = [];

  const rug = products.find((p) => p.category === "rug");
  if (rug) placed.push({ productId: rug.id, x: W / 2, y: D / 2, rotation: 0 });

  const sofa = products.find((p) => p.category === "sofa");
  if (sofa) placed.push({ productId: sofa.id, x: W / 2, y: D - sofa.depth / 2 - 0.6, rotation: 180 });

  const table = products.find((p) => p.category === "table");
  if (table) placed.push({ productId: table.id, x: W / 2, y: D / 2 + 0.2, rotation: 0 });

  const chair = products.find((p) => p.category === "chair");
  if (chair) placed.push({ productId: chair.id, x: 1.6, y: 1.6, rotation: 45 });

  const lamp = products.find((p) => p.category === "lamp");
  if (lamp) placed.push({ productId: lamp.id, x: W - 1, y: 1, rotation: 0 });

  const shelf = products.find((p) => p.category === "shelf");
  if (shelf) placed.push({ productId: shelf.id, x: 0.7, y: D / 2, rotation: 90 });

  const plant = products.find((p) => p.category === "plant");
  if (plant) placed.push({ productId: plant.id, x: W - 1, y: D - 1, rotation: 0 });

  const art = products.find((p) => p.category === "art");
  if (art) placed.push({ productId: art.id, x: W / 2, y: 0.15, rotation: 0 });

  const bed = products.find((p) => p.category === "bed");
  if (bed) placed.push({ productId: bed.id, x: W / 2, y: bed.depth / 2 + 0.6, rotation: 0 });

  return placed;
}
