"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { RotateCcw, Save, Wand2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TopView } from "@/components/canvas/TopView";
import { ProductRail } from "@/components/canvas/ProductRail";
import { SwapDrawer } from "@/components/canvas/SwapDrawer";
import { SuggestionsPanel } from "@/components/canvas/SuggestionsPanel";
import { generateLayouts } from "@/lib/layout";
import { alternatives } from "@/lib/recommend";
import { SAMPLE_CATALOG } from "@/lib/catalog";
import type { DetectedRoom, LayoutOption, PlacedItem, Product, RoomSpec, Category } from "@/lib/types";

const RoomScene = dynamic(() => import("@/components/canvas/RoomScene").then((m) => m.RoomScene), { ssr: false, loading: () => <div className="card h-[560px] animate-pulse" /> });
const RenderScene = dynamic(() => import("@/components/canvas/RenderScene").then((m) => m.RenderScene), { ssr: false, loading: () => <div className="card h-[560px] animate-pulse" /> });

type View = "top" | "3d" | "render";

const VIEW_LABELS: Record<View, string> = { top: "2D plan", "3d": "3D blocks", render: "3D rendered" };

interface Brief extends RoomSpec { detected: DetectedRoom | null }

type LiveListing = {
  category: Product["category"];
  title: string;
  url: string;
  image_url?: string;
  price: number;
  dimensions_inches: { width: number | null; depth: number | null; height: number | null };
  fit_status: "fits" | "tight-fit" | "does-not-fit" | "cannot-verify";
  rationale: string;
};

function liveProduct(item: LiveListing): Product | null {
  const { width, depth, height } = item.dimensions_inches;
  if (!item.image_url || width === null || depth === null || height === null || item.fit_status !== "fits") return null;
  return {
    id: `live-${item.url.split("/").filter(Boolean).slice(-1)[0]}`,
    title: item.title,
    price: item.price,
    source: "ikea",
    url: item.url,
    image: item.image_url,
    category: item.category,
    color: "#F3F0E8",
    width: width / 12,
    depth: depth / 12,
    height: height / 12,
    material: "Live public listing",
    vibe: ["warm", "editorial"]
  };
}

const DEMO_BRIEF: Brief = {
  // Public sample apartment floor plan: bedroom 10′1″ × 12′7″.
  widthFt: 10 + 1 / 12, depthFt: 12 + 7 / 12, budget: 250, style: "warm-minimal", mustHave: ["shelf"],
  roomType: "bedroom", goal: "storage",
  vibeTags: ["warm", "editorial"], vibePalette: ["#E9E0D2", "#C89F5A", "#3A342C"],
  detected: {
    widthFt: 10 + 1 / 12, depthFt: 12 + 7 / 12, confidence: 0.62,
    openings: [],
    existing: [], palette: ["#E9E0D2", "#C89F5A", "#3A342C"],
    lightingNote: "One window on the north wall. A mirror on the west wall will double the light."
  }
};

export default function CanvasPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [layouts, setLayouts] = useState<LayoutOption[]>([]);
  const [activeLayout, setActiveLayout] = useState(0);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<View>("top");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<{ title: string; body: string; tradition: string }[]>([]);
  const [usingLiveCatalog, setUsingLiveCatalog] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = sessionStorage.getItem("sightline:brief");
    const b: Brief = params.get("demo") ? DEMO_BRIEF : stored ? JSON.parse(stored) : DEMO_BRIEF;
    setBrief(b);
    (async () => {
      const wallSpan = Math.max(24, Math.min(48, Math.round(b.widthFt * 12 - 84)));
      const live = await fetch(`/api/catalog?budget=${b.budget}&free_wall_span=${wallSpan}&max_depth=18`);
      const liveJson = live.ok ? await live.json() : null;
      const liveProducts = (liveJson?.results ?? []).map(liveProduct).filter(Boolean) as Product[];
      const productsForRoom = liveProducts.length
        ? liveProducts
        : (await (await fetch("/api/search", { method: "POST", body: JSON.stringify(b) })).json()).products as Product[];
      setProducts(productsForRoom);
      setTotal(productsForRoom.reduce((sum, product) => sum + product.price, 0));
      setUsingLiveCatalog(liveProducts.length > 0);
      const ls = generateLayouts(b, productsForRoom, b.detected || undefined);
      setLayouts(ls);
      setPlaced(ls[0].placed);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!brief || !placed.length) return;
    const cats = placed.map((p) => products.find((x) => x.id === p.productId)?.category).filter(Boolean) as string[];
    fetch("/api/suggest", { method: "POST", body: JSON.stringify({ spec: brief, placedCategories: cats, vibeTags: brief.vibeTags }) })
      .then((r) => r.json()).then((j) => setSuggestions(j.suggestions || []));
  }, [placed, products, brief]);

  const selected = useMemo(() => products.find((p) => p.id === selectedId) || null, [selectedId, products]);
  const swap = useMemo(() => products.find((p) => p.id === swapId) || null, [swapId, products]);
  const swapAlts = useMemo(() => (swap && brief ? alternatives(swap, brief) : []), [swap, brief]);

  function applyLayout(i: number) {
    setActiveLayout(i);
    setPlaced(layouts[i].placed);
    setSelectedId(null);
  }

  function pickAlternative(a: Product) {
    if (!swap) return;
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === swap.id ? a : p));
      return next.some((p) => p.id === a.id && p !== a) ? prev.filter((p) => p.id !== swap.id).concat(a) : next;
    });
    setPlaced((prev) => prev.map((p) => (p.productId === swap.id ? { ...p, productId: a.id, rationale: ["Swapped in. Matches your palette closer."] } : p)));
    setTotal((t) => t - swap.price + a.price);
    setSwapId(null);
  }

  if (loading || !brief) return (
    <main><Nav /><div className="mx-auto max-w-3xl px-6 pb-24 pt-40 text-center">
      <div className="mx-auto h-14 w-14 rounded-full border-2 border-brass border-t-transparent animate-spin" />
      <div className="mt-6 font-display text-3xl">Reading the room…</div>
      <div className="mt-1 text-sm text-ash">Checking the live catalog against confirmed dimensions.</div>
    </div></main>
  );

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-28">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="pill">Canvas · Fig. 01</div>
            <h1 className="font-display mt-3 text-4xl md:text-5xl">A {brief.style.replace("-", " ")} {brief.roomType || "room"}</h1>
            <div className="mt-1 text-[13px] text-ash">{brief.widthFt}′ × {brief.depthFt}′ · Confidence {((brief.detected?.confidence ?? 0.8) * 100).toFixed(0)}% · <span className="text-brass">{layouts[activeLayout]?.method}</span></div>
            <div className="mt-1 text-[11px] text-ash">Public sample floor plan · {usingLiveCatalog ? "live catalog data; verify before purchase" : "seed catalog fallback"}</div>
          </div>
          <div className="flex rounded-full border border-rule p-1 text-xs">
            {(["top", "3d", "render"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-ink text-paper" : "text-ash hover:text-ink"}`}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Layout options */}
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {layouts.map((l, i) => (
            <motion.button
              key={l.id}
              onClick={() => applyLayout(i)}
              whileHover={{ y: -2 }}
              className={`card card-lift p-4 text-left ${i === activeLayout ? "border-brass" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Option {String(i + 1).padStart(2, "0")}</div>
                <div className="font-mono text-[10px] text-ash">{(l.score * 100).toFixed(0)} score</div>
              </div>
              <div className="mt-2 font-display text-2xl">{l.name}</div>
              <div className="text-[11px] text-ash">{l.method}</div>
            </motion.button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {view === "top" && (
              <TopView room={brief} detected={brief.detected} products={products} placed={placed} selectedId={selectedId} onSelect={setSelectedId} onChange={setPlaced} />
            )}
            {view === "3d" && (
              <RoomScene room={brief} detected={brief.detected} products={products} placed={placed} selectedId={selectedId} />
            )}
            {view === "render" && (
              <RenderScene room={brief} detected={brief.detected} products={products} placed={placed} selectedId={selectedId} onSelect={setSelectedId} />
            )}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost" onClick={() => applyLayout(activeLayout)}><Wand2 className="h-3.5 w-3.5" /> Re-run principles</button>
              <button className="btn btn-ghost" onClick={() => window.location.href = "/capture"}><RotateCcw className="h-3.5 w-3.5" /> Start over</button>
              <button className="btn btn-primary ml-auto" onClick={() => alert("Saved.")}><Save className="h-3.5 w-3.5" /> Save room</button>
            </div>

            {selected && (
              <div className="card p-4">
                <div className="flex items-start gap-4">
                  <img src={selected.image} alt="" className="h-32 w-32 rounded-md object-cover" />
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Selected</div>
                    <div className="font-display text-2xl leading-tight">{selected.title}</div>
                    <div className="mt-1 text-[13px] text-ash">{selected.width}′ × {selected.depth}′ × {selected.height}′ · {selected.material}</div>
                    {placed.find((p) => p.productId === selected.id)?.rationale.map((r, i) => (
                      <div key={i} className="mt-2 border-l-2 border-brass/50 pl-3 text-[12px] text-ash">{r}</div>
                    ))}
                  </div>
                  <button onClick={() => setSwapId(selected.id)} className="btn btn-brass text-xs">Swap</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <ProductRail placed={placed} products={products} selectedId={selectedId} onSelect={setSelectedId} total={total} budget={brief.budget} onSwap={setSwapId} />
            <SuggestionsPanel suggestions={suggestions} />
            {brief.vibePalette && (
              <div className="card p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Your palette</div>
                <div className="mt-3 flex gap-1.5">{brief.vibePalette.map((c) => <span key={c} className="h-8 w-8 rounded-full border border-rule" style={{ background: c }} />)}</div>
                {brief.vibeTags && <div className="mt-3 flex flex-wrap gap-1.5">{brief.vibeTags.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {swap && <SwapDrawer current={swap} alternatives={swapAlts} onClose={() => setSwapId(null)} onPick={pickAlternative} />}

      <Footer />
    </main>
  );
}
