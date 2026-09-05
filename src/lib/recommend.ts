import { SAMPLE_CATALOG } from "./catalog";
import type { Product, RoomSpec, Category } from "./types";

const DEFAULT_ROOM_MIX: Category[] = ["sofa", "chair", "table", "rug", "lamp", "plant", "art"];

export function recommend(spec: RoomSpec): Product[] {
  const wanted = spec.mustHave.length ? spec.mustHave : DEFAULT_ROOM_MIX;
  const remaining = spec.budget;

  const byCategory = new Map<Category, Product[]>();
  for (const p of SAMPLE_CATALOG) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }

  const chosen: Product[] = [];
  let spent = 0;
  for (const cat of wanted) {
    const options = (byCategory.get(cat) || []).slice().sort((a, b) => b.price - a.price);
    const target = pickForBudget(options, remaining - spent, wanted.length - chosen.length);
    if (target) {
      chosen.push(target);
      spent += target.price;
    }
  }

  const extras = SAMPLE_CATALOG.filter((p) => !chosen.includes(p) && spent + p.price <= remaining).slice(0, 2);
  return [...chosen, ...extras];
}

function pickForBudget(items: Product[], budgetLeft: number, slotsLeft: number): Product | null {
  const per = budgetLeft / Math.max(1, slotsLeft);
  let best: Product | null = null;
  let bestDelta = Infinity;
  for (const p of items) {
    if (p.price > budgetLeft) continue;
    const delta = Math.abs(p.price - per);
    if (delta < bestDelta) {
      best = p;
      bestDelta = delta;
    }
  }
  return best;
}
