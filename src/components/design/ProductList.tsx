"use client";
import { ExternalLink, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  amazon: "Amazon",
  facebook: "Facebook Marketplace",
  target: "Target",
  wayfair: "Wayfair",
  ikea: "IKEA"
};

const AVAILABILITY_LABEL = {
  "in-stock": "In stock",
  limited: "Limited stock",
  preorder: "Pre-order",
  sold: "Sold",
  unknown: "Check availability"
} as const;

function furnitureSummary(p: Product) {
  if (p.summary) return p.summary;
  const footprint = `${p.width}' × ${p.depth}'`;
  const role: Record<Product["category"], string> = {
    sofa: "anchors the seating area and gives the room its main place to lounge",
    chair: "adds a flexible extra seat without taking over the room",
    table: "creates a useful landing spot for drinks, books, and everyday living",
    bed: "sets the sleep zone and should remain easy to walk around",
    rug: "defines the seating zone and makes the arrangement feel connected",
    lamp: "brings softer, layered light to the room",
    shelf: "adds vertical storage while keeping the floor relatively open",
    plant: "adds height, texture, and a relaxed finishing layer",
    art: "gives the wall a focal point and ties the palette together"
  };
  return `Uses a ${footprint} footprint; it ${role[p.category]}.`;
}

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
          <li key={p.id} className="flex items-start gap-3 py-3">
            <img src={p.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.title}</div>
              <div className="mt-0.5 text-xs text-black/60">{SOURCE_LABEL[p.source]} · {p.width}&apos; W × {p.depth}&apos; D × {p.height}&apos; H</div>
              <p className="mt-1 text-xs leading-5 text-black/65">{furnitureSummary(p)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/60">
                <span className={p.availability === "sold" ? "text-accent" : ""}>{AVAILABILITY_LABEL[p.availability ?? "unknown"]}</span>
                {p.rating && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current" /> {p.rating.toFixed(1)}{p.reviewCount ? ` (${p.reviewCount.toLocaleString()})` : ""}</span>}
              </div>
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
