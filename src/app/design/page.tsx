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

export default function DesignPage() {
  const [spec, setSpec] = useState<RoomSpec | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("top");

  async function generate(s: RoomSpec) {
    setLoading(true);
    try {
      const res = await fetch("/api/search", { method: "POST", body: JSON.stringify(s) });
      const json = await res.json();
      setSpec(json.spec);
      setProducts(json.products);
      setTotal(json.total);
      setPlaced(autoLayout(json.spec, json.products));
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
            </div>
            <Wizard onGenerate={generate} />
          </div>
        )}

        {loading && (
          <div className="mx-auto max-w-3xl pt-10 text-center">
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-clay border-t-transparent animate-spin" />
            <div className="mt-5 font-display text-2xl">Searching Amazon, Facebook, Target...</div>
            <div className="mt-1 text-sm text-black/60">Matching your budget and vibe.</div>
          </div>
        )}

        {spec && !loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="pill">Your room</div>
                  <h1 className="font-display mt-2 text-4xl">A {spec.style.replace("-", " ")} space</h1>
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
