"use client";
import { ExternalLink, Star } from "lucide-react";
import type { PlacedItem, Product } from "@/lib/types";
import { money } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = { amazon: "Amazon", facebook: "Facebook Marketplace", target: "Target", wayfair: "Wayfair", ikea: "IKEA", westelm: "West Elm", cb2: "CB2", article: "Article" };
const FIT_LABEL = { fits: "Fits", tight: "Tight fit", conflict: "Conflict", unverified: "Unverified" };
const FIT_STYLE = { fits: "text-brass border-brass/40", tight: "text-amber-300 border-amber-300/40", conflict: "text-red-400 border-red-400/40", unverified: "text-ash border-ash/40" };

export function ProductRail({ placed, products, selectedId, onSelect, total, budget, onSwap }: {
  placed: PlacedItem[]; products: Product[]; selectedId: string | null;
  onSelect: (id: string) => void; total: number; budget: number; onSwap: (id: string) => void;
}) {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return (
    <div className="card">
      <div className="border-b border-rule/30 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Shopping list</div>
            <div className="font-display text-2xl">{placed.length} pieces</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Total / Budget</div>
            <div className={`font-display text-2xl ${total > budget ? "text-red-400" : ""}`}>
              {money(total)} <span className="text-base text-ash/60">/ {money(budget)}</span>
            </div>
          </div>
        </div>
      </div>
      <ul className="max-h-[560px] divide-y divide-rule/20 overflow-auto">
        {placed.map((p) => {
          const prod = byId[p.productId];
          if (!prod) return null;
          const sel = selectedId === p.productId;
          return (
            <li key={p.productId}>
              <button onClick={() => onSelect(p.productId)} className={`flex w-full items-start gap-3 p-3 text-left transition ${sel ? "bg-brass/5" : "hover:bg-white/[0.02]"}`}>
                <img src={prod.image} alt="" className="h-16 w-16 flex-shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{prod.title}</div>
                      <div className="text-[11px] text-ash">{SOURCE_LABEL[prod.source]} · {prod.width}′ × {prod.depth}′</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{money(prod.price)}</div>
                      <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${FIT_STYLE[p.fit]}`}>{FIT_LABEL[p.fit]}</span>
                    </div>
                  </div>
                  {p.rationale?.[0] && (
                    <div className="mt-2 border-l-2 border-brass/40 pl-2 text-[11px] leading-relaxed text-ash">{p.rationale[0]}</div>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-ash"><Star className="h-3 w-3 fill-brass text-brass" /> {prod.rating?.toFixed(1) ?? "—"}</span>
                    <span className="text-ash">{prod.width}′ W × {prod.depth}′ D × {prod.height}′ H</span>
                  </div>
                  {(prod.availability || prod.summary) && (
                    <div className="mt-2 text-[11px] leading-relaxed text-ash">
                      {prod.availability && <span className="text-brass">{prod.availability}. </span>}{prod.summary}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[11px]">
                    <a href={prod.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ash hover:text-brass"><ExternalLink className="h-3 w-3" /> source</a>
                    <button onClick={(e) => { e.stopPropagation(); onSwap(p.productId); }} className="text-brass hover:underline">swap</button>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
