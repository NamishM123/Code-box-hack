"use client";
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { money } from "@/lib/utils";

interface ChatTurn {
  id: string;
  query: string;
  status: "loading" | "done" | "error";
  category?: Category;
  results?: Product[];
}

export function ShoppingChat({ onSearch, onChoose, existing }: {
  /** Runs a live search for free text and returns the inferred category + ranked results. */
  onSearch: (text: string) => Promise<{ category: Category; results: Product[] }>;
  /** The user picked a result. Replaces the current piece in that category, or adds it if there isn't one yet. */
  onChoose: (category: Category, product: Product) => void;
  /** Categories already in the room, so results can say "Replace" vs "Add". */
  existing: Set<Category>;
}) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  async function submit() {
    const query = text.trim();
    if (!query) return;
    setText("");
    const id = crypto.randomUUID();
    setTurns((prev) => [...prev, { id, query, status: "loading" }]);
    try {
      const { category, results } = await onSearch(query);
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done", category, results } : t)));
    } catch {
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error" } : t)));
    }
  }

  return (
    <div className="border-t border-rule p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-brass" />
        <div className="eyebrow text-brass">Ask for more options</div>
      </div>

      {turns.length > 0 && (
        <div className="mb-3 max-h-[420px] space-y-4 overflow-auto">
          {turns.map((t) => (
            <div key={t.id} className="space-y-2">
              <div className="ml-auto max-w-[85%] rounded-md rounded-br-sm bg-ink/[0.04] px-3 py-2 text-[12px]">{t.query}</div>
              {t.status === "loading" && (
                <div className="flex items-center gap-2 text-[11px] text-ash"><Loader2 className="h-3 w-3 animate-spin" /> Searching live listings…</div>
              )}
              {t.status === "error" && (
                <div className="text-[11px] text-red-400">Could not search that. Try rephrasing.</div>
              )}
              {t.status === "done" && (
                <>
                  <div className="text-[11px] text-ash">
                    {t.results?.length
                      ? `Found ${t.results.length} for ${t.category}${existing.has(t.category!) ? ". Pick one to replace what's there" : ". Pick one to add it"}.`
                      : `No live matches for ${t.category}. Try different words.`}
                  </div>
                  <ul className="space-y-2">
                    {t.results?.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => onChoose(t.category!, p)}
                          className="flex w-full gap-2 rounded-md border border-rule/40 p-2 text-left transition hover:border-brass"
                        >
                          <img src={p.image} className="h-12 w-12 rounded object-cover" alt="" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-medium">{p.title}</div>
                            <div className="text-[10px] text-ash">{p.width}′ × {p.depth}′</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[12px] font-semibold">{money(p.price)}</div>
                            <div className="text-[10px] text-brass">{existing.has(t.category!) ? "Replace" : "Add"}</div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="a walnut floor lamp under $100"
          className="field flex-1 text-sm"
        />
        <button onClick={submit} disabled={!text.trim()} className="btn btn-brass shrink-0 text-xs">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
