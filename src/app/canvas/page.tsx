"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, RotateCcw, Save, Wand2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TopView } from "@/components/canvas/TopView";
import { ProductRail } from "@/components/canvas/ProductRail";
import { ShoppingChat } from "@/components/canvas/ShoppingChat";
import { SwapDrawer } from "@/components/canvas/SwapDrawer";
import { SuggestionsPanel } from "@/components/canvas/SuggestionsPanel";
import { SaveDialog } from "@/components/canvas/SaveBar";
import { generateLayouts, previewFit, reseat, type ReferencePlan } from "@/lib/layout";
import { alternatives } from "@/lib/recommend";
import { SAMPLE_CATALOG } from "@/lib/catalog";
import { decodeRoom, encodeRoom, getRoom, saveRoom } from "@/lib/storage";
import type { Category, DetectedRoom, LayoutOption, PlacedItem, Product, RoomSpec } from "@/lib/types";

const RenderScene = dynamic(() => import("@/components/canvas/RenderScene").then((m) => m.RenderScene), { ssr: false, loading: () => <div className="card h-[560px] animate-pulse" /> });

/** 10.0833 -> 10′1″ */
function feet(v: number): string {
  const whole = Math.floor(v);
  const inches = Math.round((v - whole) * 12);
  if (inches === 0) return `${whole}′`;
  if (inches === 12) return `${whole + 1}′`;
  return `${whole}′${inches}″`;
}

type View = "top" | "render" | "realistic";

const VIEW_LABELS: Record<View, string> = { top: "2D plan", render: "3D rendered", realistic: "Realistic" };

interface Brief extends RoomSpec {
  detected: DetectedRoom | null;
  searchTerms?: string[];
  capturePhotoUrls?: string[];
  /** Pieces already chosen from a Pinterest look, laid out as-is. */
  lookProducts?: Product[];
  /** Where those pieces stood in the picture, so the plan can copy it. */
  lookPlan?: ReferencePlan;
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
    photoVerified: true,
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
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<{ title: string; body: string; tradition: string }[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [feed, setFeed] = useState<{ live: boolean; poolSize?: number; sources: string[]; notes?: string[] } | null>(null);
  const [liveAlternates, setLiveAlternates] = useState<Partial<Record<Category, Product[]>>>({});

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

    // 3b. Pieces picked from a Pinterest look arrive with the brief. They were
    // already searched, ranked and pruned by hand in the lightbox, so lay them
    // out as they are rather than spending another dozen searches re-finding
    // them and possibly landing on different listings.
    if (b.lookProducts?.length) {
      const chosen = b.lookProducts;
      setProducts(chosen);
      setTotal(chosen.reduce((sum, product) => sum + product.price, 0));
      setFeed({ live: true, poolSize: chosen.length, sources: [`${chosen.length} from your look`] });
      const looked = generateLayouts(b, chosen, b.detected || undefined, b.lookPlan);
      setLayouts(looked);
      setPlaced(looked[0].placed);
      setLoading(false);
      return;
    }
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
        if (json?.alternatesByCategory) setLiveAlternates(json.alternatesByCategory);
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
  const swapAlts = useMemo(() => {
    if (!swap || !brief) return [];
    const live = (liveAlternates[swap.category] || []).filter((p) => p.id !== swap.id);
    if (live.length) return live;
    return alternatives(swap, brief);
  }, [swap, brief, liveAlternates]);

  /** Re-searches live listings for the swapped category using free text from the describe box. */
  async function describeSwap(text: string) {
    if (!swap || !brief) return;
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...brief, mustHave: [swap.category], onlyCategory: swap.category, describe: text })
    });
    if (!res.ok) throw new Error(`search ${res.status}`);
    const json = await res.json();
    const alts = (json?.alternates ?? []) as Product[];
    setLiveAlternates((prev) => ({ ...prev, [swap.category]: alts }));
  }

  function applyLayout(i: number) {
    setActiveLayout(i);
    setPlaced(layouts[i].placed);
    setSelectedId(null);
  }

  /**
   * The layout already decided where this piece belongs. Swapping the product
   * keeps that slot and only re-seats the new one to its own depth, then
   * re-runs the fit check so the verdict on screen is about the piece actually
   * standing there.
   */
  function pickAlternative(a: Product) {
    if (!swap || !brief) return;
    const replaced = products.map((p) => (p.id === swap.id ? a : p));
    const nextProducts = replaced.filter((p, i) => replaced.findIndex((q) => q.id === p.id) === i);
    const nextPlaced = placed.map((p) => (p.productId === swap.id ? { ...p, productId: a.id } : p));

    setProducts(nextProducts);
    setPlaced(reseat(nextPlaced, nextProducts, brief, brief.detected || undefined, a.id));
    setTotal((t) => t - swap.price + a.price);
    setSelectedId(a.id);
    setSwapId(null);
  }

  const existingCategories = useMemo(() => new Set(products.map((p) => p.category)), [products]);

  /** Shopping-list chat: free text in, category inferred, several live candidates back. */
  async function searchForChat(text: string): Promise<{ category: Category; results: Product[] }> {
    if (!brief) return { category: "table", results: [] };
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...brief, describe: text, topN: 6 })
    });
    if (!res.ok) throw new Error(`search ${res.status}`);
    const json = await res.json();
    return { category: json.category, results: (json.alternates ?? []) as Product[] };
  }

  /**
   * The chat's decision has to actually change the room: replace the piece
   * already in that category, or add this as a new piece and re-run layout
   * so it lands somewhere sensible rather than floating unplaced.
   */
  function chooseFromChat(category: Category, product: Product) {
    if (!brief) return;
    const current = products.find((p) => p.category === category);
    if (current) {
      setProducts((prev) => prev.map((p) => (p.id === current.id ? product : p)));
      setPlaced((prev) => prev.map((p) => (p.productId === current.id ? { ...p, productId: product.id, rationale: ["Added from chat."] } : p)));
      setTotal((t) => t - current.price + product.price);
      setLiveAlternates((prev) => ({ ...prev, [category]: (prev[category] || []).filter((p) => p.id !== product.id) }));
    } else {
      const nextProducts = [...products, product];
      const ls = generateLayouts(brief, nextProducts, brief.detected || undefined);
      setProducts(nextProducts);
      setLayouts(ls);
      setPlaced((ls[activeLayout] ?? ls[0]).placed);
      setTotal(nextProducts.reduce((sum, p) => sum + p.price, 0));
    }
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
    try {
      doPersist(name);
    } catch {
      /* storage refused it; still show Your Rooms rather than nothing at all */
    }
    router.push("/rooms");
  }

  function doPersist(name: string) {
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
            {/* Guarded the same way roomName is: a brief saved by an older
                build, or a shared link missing the field, has no style, and an
                unguarded .replace here took the whole canvas down. */}
            <h1 className="font-display mt-3 text-4xl md:text-5xl">A {(brief.style || "warm-minimal").replace("-", " ")} {brief.roomType || "room"}</h1>
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
            {(["top", "render", "realistic"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-ink text-paper" : "text-ash hover:text-ink"}`}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Layout options */}
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {layouts.map((l, i) => {
            const PX_MINI = 8;
            const mW = brief.widthFt * PX_MINI;
            const mD = brief.depthFt * PX_MINI;
            return (
              <motion.button
                key={l.id}
                onClick={() => applyLayout(i)}
                whileHover={{ y: -2 }}
                className={`card card-lift overflow-hidden text-left ${i === activeLayout ? "border-brass" : ""}`}
              >
                <div className="flex items-center justify-between px-4 pt-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Option {String(i + 1).padStart(2, "0")}</div>
                </div>
                <div className="flex items-center justify-center px-4 py-4">
                  <svg width={mW} height={mD} viewBox={`0 0 ${mW} ${mD}`} className="rounded border border-rule/40 bg-white">
                    {l.placed.map((p) => {
                      const prod = products.find((pr) => pr.id === p.productId);
                      if (!prod) return null;
                      const pw = prod.width * PX_MINI;
                      const ph = prod.depth * PX_MINI;
                      return (
                        <rect
                          key={p.productId}
                          x={p.x * PX_MINI - pw / 2}
                          y={p.y * PX_MINI - ph / 2}
                          width={pw}
                          height={ph}
                          rx={2}
                          fill={prod.color || "rgba(168,87,26,0.4)"}
                          stroke="rgba(12,12,13,0.25)"
                          strokeWidth={0.5}
                          transform={`rotate(${p.rotation} ${p.x * PX_MINI} ${p.y * PX_MINI})`}
                        />
                      );
                    })}
                  </svg>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {view === "top" && (
              <TopView room={brief} detected={brief.detected} products={products} placed={placed} selectedId={selectedId} onSelect={setSelectedId} onChange={setPlaced} />
            )}
            {view === "render" && (
              <RenderScene room={brief} detected={brief.detected} products={products} placed={placed} selectedId={selectedId} onSelect={setSelectedId} />
            )}
            {view === "realistic" && (
              <RenderScene key="realistic" room={brief} detected={brief.detected} products={products} placed={placed} selectedId={selectedId} onSelect={setSelectedId} auto />
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
            <ProductRail
              placed={placed} products={products} selectedId={selectedId} onSelect={setSelectedId} total={total} budget={brief.budget} onSwap={setSwapId}
              chat={<ShoppingChat onSearch={searchForChat} onChoose={chooseFromChat} existing={existingCategories} />}
            />
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

      {swap && (
        <SwapDrawer
          current={swap}
          alternatives={swapAlts}
          onClose={() => setSwapId(null)}
          onPick={pickAlternative}
          onDescribe={describeSwap}
          fitOf={(candidate) => (brief ? previewFit(placed, products, brief, brief.detected || undefined, swap.id, candidate) : "unverified")}
        />
      )}
      {saveOpen && <SaveDialog defaultName={roomName} shareUrl={shareUrl} onSave={persist} onClose={() => setSaveOpen(false)} />}

      <Footer />
    </main>
  );
}
