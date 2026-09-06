"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, RotateCcw, Save, Wand2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TopView } from "@/components/canvas/TopView";
import { ProductRail } from "@/components/canvas/ProductRail";
import { SwapDrawer } from "@/components/canvas/SwapDrawer";
import { SuggestionsPanel } from "@/components/canvas/SuggestionsPanel";
import { SaveDialog } from "@/components/canvas/SaveBar";
import { generateLayouts } from "@/lib/layout";
import { alternatives } from "@/lib/recommend";
import { SAMPLE_CATALOG } from "@/lib/catalog";
import { decodeRoom, encodeRoom, getRoom, saveRoom } from "@/lib/storage";
import type { DetectedRoom, LayoutOption, PlacedItem, Product, RoomSpec } from "@/lib/types";

const RoomScene = dynamic(() => import("@/components/canvas/RoomScene").then((m) => m.RoomScene), { ssr: false, loading: () => <div className="card h-[560px] animate-pulse" /> });
const RenderScene = dynamic(() => import("@/components/canvas/RenderScene").then((m) => m.RenderScene), { ssr: false, loading: () => <div className="card h-[560px] animate-pulse" /> });

/** 10.0833 -> 10′1″ */
function feet(v: number): string {
  const whole = Math.floor(v);
  const inches = Math.round((v - whole) * 12);
  if (inches === 0) return `${whole}′`;
  if (inches === 12) return `${whole + 1}′`;
  return `${whole}′${inches}″`;
}

type View = "top" | "3d" | "render";

const VIEW_LABELS: Record<View, string> = { top: "2D plan", "3d": "3D blocks", render: "3D rendered" };

interface Brief extends RoomSpec {
  detected: DetectedRoom | null;
  searchTerms?: string[];
  capturePhotoUrls?: string[];
}

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
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [feed, setFeed] = useState<{ live: boolean; poolSize?: number; sources: string[]; notes?: string[] } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // 1. A shared link carries the entire plan in the URL.
    const share = params.get("s");
    if (share) {
      const decoded = decodeRoom(share);
      if (decoded) {
        const b: Brief = { ...decoded.spec, detected: decoded.detected };
        const prods = decoded.placed
          .map((p) => SAMPLE_CATALOG.find((c) => c.id === p.productId))
          .filter(Boolean) as Product[];
        setBrief(b);
        setProducts(prods);
        setPlaced(decoded.placed);
        setTotal(decoded.total);
        setLayouts(generateLayouts(b, prods, b.detected || undefined));
        setLoading(false);
        return;
      }
    }

    // 2. A room saved in this browser.
    const roomId = params.get("room");
    if (roomId) {
      const saved = getRoom(roomId);
      if (saved) {
        const b: Brief = { ...saved.spec, detected: saved.detected };
        const prods = saved.products?.length
          ? saved.products
          : saved.productIds
              .map((id) => SAMPLE_CATALOG.find((c) => c.id === id))
              .filter(Boolean) as Product[];
        setBrief(b);
        setProducts(prods);
        setPlaced(saved.placed);
        setTotal(saved.total);
        setLayouts(generateLayouts(b, prods, b.detected || undefined));
        setSavedId(saved.id);
        setLoading(false);
        return;
      }
    }

    // 3. A fresh brief from the capture flow, or the demo room.
    const stored = sessionStorage.getItem("sightline:brief");
    const b: Brief = params.get("demo") ? DEMO_BRIEF : stored ? JSON.parse(stored) : DEMO_BRIEF;
    setBrief(b);
    (async () => {
      // Two feeds, run together. The Python catalog returns a small set of
      // publicly-listed items with confirmed dimensions; /api/search fans out
      // across SerpAPI and Apify. Verified dimensions win, so the catalog's
      // picks take precedence per category and the rest fills in around them.
      const wallSpan = Math.max(24, Math.min(48, Math.round(b.widthFt * 12 - 84)));
      const [catalogRes, searchRes] = await Promise.allSettled([
        fetch(`/api/catalog?budget=${b.budget}&free_wall_span=${wallSpan}&max_depth=18`),
        fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(b)
        })
      ]);

      let confirmed: Product[] = [];
      if (catalogRes.status === "fulfilled" && catalogRes.value.ok) {
        const json = await catalogRes.value.json().catch(() => null);
        confirmed = ((json?.results ?? []) as LiveListing[]).map(liveProduct).filter(Boolean) as Product[];
      }

      let searched: Product[] = [];
      let searchMeta: { live?: boolean; poolSize?: number; notes?: string[] } = {};
      if (searchRes.status === "fulfilled" && searchRes.value.ok) {
        const json = await searchRes.value.json().catch(() => null);
        searched = (json?.products ?? []) as Product[];
        searchMeta = { live: json?.live, poolSize: json?.poolSize, notes: json?.notes };
      }

      const confirmedCats = new Set(confirmed.map((p) => p.category));
      const productsForRoom = [...confirmed, ...searched.filter((p) => !confirmedCats.has(p.category))];

      const sources: string[] = [];
      if (confirmed.length) sources.push(`${confirmed.length} confirmed`);
      if (searchMeta.live) sources.push(`${searchMeta.poolSize} listings`);

      setProducts(productsForRoom);
      setTotal(productsForRoom.reduce((sum, product) => sum + product.price, 0));
      setFeed({
        live: confirmed.length > 0 || Boolean(searchMeta.live),
        poolSize: searchMeta.poolSize,
        sources,
        notes: searchMeta.notes
      });
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

  const roomName = brief ? `${(brief.style || "warm-minimal").replace("-", " ")} ${brief.roomType || "room"}` : "Room";

  const shareUrl = useMemo(() => {
    if (!brief || typeof window === "undefined") return "";
    const token = encodeRoom({
      name: roomName,
      spec: brief,
      detected: brief.detected,
      placed,
      total,
      layoutName: layouts[activeLayout]?.name || "Custom"
    });
    return `${window.location.origin}/canvas?s=${token}`;
  }, [brief, placed, total, layouts, activeLayout, roomName]);

  function persist(name: string) {
    if (!brief) return;
    const entry = saveRoom({
      id: savedId || undefined,
      name,
      spec: brief,
      detected: brief.detected,
      productIds: products.map((p) => p.id),
      products,
      placed,
      total,
      layoutName: layouts[activeLayout]?.name || "Custom"
    });
    setSavedId(entry.id);
    setSaveOpen(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  if (loading || !brief) return (
    <main><Nav /><div className="mx-auto max-w-3xl px-6 pb-24 pt-40 text-center">
      <div className="mx-auto h-14 w-14 rounded-full border-2 border-brass border-t-transparent animate-spin" />
      <div className="mt-6 font-display text-3xl">Preparing the room…</div>
      <div className="mt-1 text-sm text-ash">Loading the editable plan and reference pieces.</div>
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
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ash">
              <span>{feet(brief.widthFt)} × {feet(brief.depthFt)}</span>
              <span className="text-rule">/</span>
              <span>Confidence {Math.round((brief.detected?.confidence ?? 0.8) * 100)}%</span>
              <span className="text-rule">/</span>
              <span className="text-brass">{layouts[activeLayout]?.method}</span>
              {feed && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${feed.live ? "border-brass/40 text-brass" : "border-rule/50 text-ash"}`}>
                  {feed.live ? "Reference catalog" : "Seed catalog"}
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-ash">
              {feed?.live
                ? "Reference listings. Confirm retailer details and dimensions before purchasing."
                : "Seed catalog. Dimensions are illustrative."}
            </div>
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
            {brief.capturePhotoUrls?.length ? (
              <section className="card p-4" aria-label="Captured room reference views">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Captured room views</div>
                    <p className="mt-1 text-[12px] text-ash">{brief.capturePhotoUrls.length} reference photos inform this {feet(brief.widthFt)} × {feet(brief.depthFt)} layout.</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ash">Reference only</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {brief.capturePhotoUrls.map((url, index) => (
                    <img key={`${url}-${index}`} src={url} alt={`Captured room view ${index + 1}`} className="aspect-square w-full rounded-md border border-rule object-cover" />
                  ))}
                </div>
              </section>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost" onClick={() => applyLayout(activeLayout)}><Wand2 className="h-3.5 w-3.5" /> Re-run principles</button>
              <button className="btn btn-ghost" onClick={() => window.location.href = "/capture"}><RotateCcw className="h-3.5 w-3.5" /> Start over</button>
              <Link href="/saved" className="btn btn-ghost">Saved rooms</Link>
              <button className="btn btn-primary ml-auto" onClick={() => setSaveOpen(true)}>
                {justSaved ? <><Check className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save &amp; share</>}
              </button>
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
      {saveOpen && <SaveDialog defaultName={roomName} shareUrl={shareUrl} onSave={persist} onClose={() => setSaveOpen(false)} />}

      <Footer />
    </main>
  );
}
