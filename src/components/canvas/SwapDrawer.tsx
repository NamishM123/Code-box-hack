"use client";
import { X } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/utils";

export function SwapDrawer({ current, alternatives, onClose, onPick }: {
  current: Product; alternatives: Product[]; onClose: () => void; onPick: (p: Product) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-auto border-l border-rule bg-paper p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Swap {current.category}</div>
            <div className="font-display text-2xl">Alternatives</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-rule/40 p-2 hover:border-brass"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-6 rounded-md border border-brass/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Current</div>
          <div className="mt-2 flex gap-3">
            <img src={current.image} className="h-14 w-14 rounded object-cover" alt="" />
            <div>
              <div className="font-medium">{current.title}</div>
              <div className="text-[11px] text-ash">{money(current.price)} · {current.width}′ × {current.depth}′</div>
            </div>
          </div>
        </div>
        <ul className="space-y-3">
          {alternatives.map((a) => (
            <li key={a.id}>
              <button onClick={() => onPick(a)} className="flex w-full gap-3 rounded-md border border-rule/40 p-3 text-left transition hover:border-brass">
                <img src={a.image} className="h-16 w-16 rounded object-cover" alt="" />
                <div className="flex-1">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-[11px] text-ash">{a.width}′ × {a.depth}′ · {a.material}</div>
                  {a.vibe && <div className="mt-1 flex flex-wrap gap-1">{a.vibe.slice(0, 3).map((v) => <span key={v} className="chip text-[10px]">{v}</span>)}</div>}
                </div>
                <div className="text-right">
                  <div className="font-semibold">{money(a.price)}</div>
                  <div className={`text-[10px] ${a.price > current.price ? "text-amber-300" : "text-brass"}`}>{a.price > current.price ? `+${money(a.price - current.price)}` : `${money(a.price - current.price)}`}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
