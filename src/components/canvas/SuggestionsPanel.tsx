"use client";
import { Sparkles } from "lucide-react";

interface Suggestion { title: string; body: string; tradition: string }

export function SuggestionsPanel({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions.length) return null;
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brass" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Aesthetic suggestions</div>
      </div>
      <ul className="space-y-4">
        {suggestions.map((s, i) => (
          <li key={i} className="border-l-2 border-brass/40 pl-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ash">{s.tradition}</div>
            <div className="font-display text-lg leading-tight">{s.title}</div>
            <p className="mt-1 text-[12px] leading-relaxed text-ash">{s.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
