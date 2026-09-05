import { SAMPLE_CATALOG } from "./catalog";
import type { Product, RoomSpec, Category } from "./types";

const DEFAULT_MIX: Record<string, Category[]> = {
  living: ["sofa", "chair", "table", "rug", "lamp", "shelf", "plant", "art"],
  bedroom: ["bed", "nightstand", "dresser", "rug", "lamp", "mirror", "art"],
  office: ["desk", "chair", "shelf", "lamp", "plant", "art"],
  studio: ["sofa", "bed", "table", "rug", "lamp", "shelf", "plant"]
};

export function recommend(spec: RoomSpec): Product[] {
  const mix = spec.mustHave.length ? spec.mustHave : DEFAULT_MIX[spec.roomType || "living"];
  const remaining = spec.budget;

  const byCat = new Map<Category, Product[]>();
  for (const p of SAMPLE_CATALOG) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }

  // vibe scoring
  const wantTags = spec.vibeTags || [];
  const scoreVibe = (p: Product) => {
    if (!p.vibe?.length || !wantTags.length) return 0;
    return p.vibe.filter((v) => wantTags.includes(v)).length;
  };

  const chosen: Product[] = [];
  let spent = 0;
  for (const cat of mix) {
    const options = (byCat.get(cat) || [])
      .slice()
      .filter((p) => spent + p.price <= remaining)
      .sort((a, b) => scoreVibe(b) - scoreVibe(a) || Math.abs((remaining - spent) / (mix.length - chosen.length) - a.price) - Math.abs((remaining - spent) / (mix.length - chosen.length) - b.price));
    const pick = options[0];
    if (pick) { chosen.push(pick); spent += pick.price; }
  }
  return chosen;
}

export function alternatives(target: Product, spec: RoomSpec): Product[] {
  const wantTags = spec.vibeTags || [];
  return SAMPLE_CATALOG
    .filter((p) => p.category === target.category && p.id !== target.id)
    .sort((a, b) => {
      const va = a.vibe?.filter((v) => wantTags.includes(v)).length || 0;
      const vb = b.vibe?.filter((v) => wantTags.includes(v)).length || 0;
      return vb - va || Math.abs(a.price - target.price) - Math.abs(b.price - target.price);
    })
    .slice(0, 4);
}
