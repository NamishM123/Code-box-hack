"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Wizard } from "@/components/design/Wizard";
import { TopView } from "@/components/design/TopView";
import { ProductList } from "@/components/design/ProductList";
import { autoLayout } from "@/lib/layout";
import type { PlacedItem, Product, RoomSpec } from "@/lib/types";
import { motion } from "framer-motion";

const RoomScene = dynamic(() => import("@/components/design/RoomScene").then((m) => m.RoomScene), {
  ssr: false,
  loading: () => <div className="card h-[520px] animate-pulse" />
});

type View = "flat" | "top" | "3d";

type LiveListing = {
  source: "IKEA";
  category: Product["category"];
  title: string;
  url: string;
  image_url?: string;
  price: number;
  rating?: number;
  availability?: "in-stock" | "limited" | "preorder" | "sold" | "unknown";
  dimensions_inches: { width: number | null; depth: number | null; height: number | null };
  fit_status: "fits" | "tight-fit" | "does-not-fit" | "cannot-verify";
  rationale: string;
};

const SAMPLE_FLOOR_PLAN_ROOM: RoomSpec = {
  // Public sample apartment floor plan: a 10′1″ × 12′7″ bedroom.
  widthFt: 10 + 1 / 12,
  depthFt: 12 + 7 / 12,
  budget: 250,
  style: "modern-warm",
  mustHave: ["shelf"]
};

function toProduct(item: LiveListing): Product | null {
  const { width, depth, height } = item.dimensions_inches;
  if (!item.image_url || width === null || depth === null || height === null || item.fit_status !== "fits") return null;
  return {
    id: `live-${item.url.split("/").filter(Boolean).at(-1)}`,
    title: item.title,
    price: item.price,
    source: "ikea",
    url: item.url,
    image: item.image_url,
    category: item.category,
    color: "#f3f0e8",
    width: width / 12,
    depth: depth / 12,
    height: height / 12,
    rating: item.rating,
    availability: item.availability ?? "unknown",
    summary: item.rationale
  };
}

export default function DesignPage() {
  const [spec, setSpec] = useState<RoomSpec | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("top");
  const [usingLiveCatalog, setUsingLiveCatalog] = useState(false);

  async function generate(s: RoomSpec) {
    setLoading(true);
    try {
      const wallSpan = Math.max(24, Math.min(48, Math.round(s.widthFt * 12 - 84)));
      const live = await fetch(`/api/catalog?budget=${s.budget}&free_wall_span=${wallSpan}&max_depth=18`);
      const liveJson = live.ok ? await live.json() : null;
      const liveProducts = (liveJson?.results ?? []).map(toProduct).filter(Boolean) as Product[];
      if (liveProducts.length) {
        setSpec(s);
        setProducts(liveProducts);
        setTotal(liveProducts.reduce((sum, product) => sum + product.price, 0));
        setPlaced(autoLayout(s, liveProducts));
        setUsingLiveCatalog(true);
      } else {
        const res = await fetch("/api/search", { method: "POST", body: JSON.stringify(s) });
        const json = await res.json();
        setSpec(json.spec);
        setProducts(json.products);
        setTotal(json.total);
        setPlaced(autoLayout(json.spec, json.products));
        setUsingLiveCatalog(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-6">
        {!spec && (
          <div className="mx-auto max-w-3xl pt-6">
            <div className="mb-8">
              <div className="pill">Design a room</div>
              <h1 className="font-display mt-3 text-5xl md:text-6xl">Tell us about the space.</h1>
              <p className="mt-2 text-black/60">Takes about 30 seconds.</p>
              <button className="mt-4 text-sm underline underline-offset-4" onClick={() => generate(SAMPLE_FLOOR_PLAN_ROOM)}>
                Load public sample bedroom · 10&apos;1&quot; × 12&apos;7&quot;
              </button>
            </div>
            <Wizard onGenerate={generate} />
          </div>
        )}

        {loading && (
          <div className="mx-auto max-w-3xl pt-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-clay border-t-transparent animate-spin" />
            <div className="mt-5 font-display text-2xl">Checking the live catalog...</div>
            <div className="mt-1 text-sm text-black/60">Only products with complete dimensions can be placed.</div>
          </div>
        )}

        {spec && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="pill">Your room</div>
                  <h1 className="font-display mt-2 text-4xl">A {spec.style.replace("-", " ")} space</h1>
                  {usingLiveCatalog && <p className="mt-1 text-xs text-black/55">Live public catalog data · verify dimensions before purchase</p>}
                </div>
                <div className="flex rounded-full border border-black/10 bg-white/70 p-1 text-sm">
                  {(["top", "3d"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-ink text-cream" : "text-black/70 hover:text-black"}`}
                    >
                      {v === "top" ? "2D top" : "3D"}
                    </button>
                  ))}
                </div>
              </div>

              {view === "top" && <TopView room={spec} products={products} placed={placed} onChange={setPlaced} />}
              {view === "3d" && <RoomScene room={spec} products={products} placed={placed} />}

              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn btn-ghost" onClick={() => setPlaced(autoLayout(spec, products))}>Auto-arrange</button>
                <button className="btn btn-ghost" onClick={() => setSpec(null)}>Start over</button>
                <button className="btn btn-primary ml-auto" onClick={() => alert("Saved! (hook up Supabase to persist)")}>Save room</button>
              </div>
            </div>

            <div>
              <ProductList products={products} total={total} budget={spec.budget} />
            </div>
          </motion.div>
        )}
      </section>
      <Footer />
    </main>
  );
}
