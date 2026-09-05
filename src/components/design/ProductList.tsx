"use client";
import { ExternalLink } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  amazon: "Amazon",
  facebook: "Facebook Marketplace",
  target: "Target",
  wayfair: "Wayfair",
  ikea: "IKEA"
};

export function ProductList({ products, total, budget }: { products: Product[]; total: number; budget: number }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-black/50">Shopping list</div>
          <div className="font-display text-2xl">{products.length} pieces</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-black/50">Total / Budget</div>
          <div className={`font-display text-2xl ${total > budget ? "text-accent" : ""}`}>
            {money(total)} <span className="text-black/40 text-base">/ {money(budget)}</span>
          </div>
        </div>
      </div>
      <ul className="divide-y divide-black/5">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <img src={p.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.title}</div>
              <div className="text-xs text-black/60">{SOURCE_LABEL[p.source]} · {p.width}&apos; × {p.depth}&apos;</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{money(p.price)}</div>
              <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-black/60 hover:text-black">
                view <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
