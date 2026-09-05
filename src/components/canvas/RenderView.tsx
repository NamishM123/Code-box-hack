"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Camera as CameraIcon, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { CAMERAS, type Camera } from "@/lib/render/describe";
import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "@/lib/types";

interface Props {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  placed: PlacedItem[];
  products: Product[];
}

interface Shot { image: string; camera: Camera; referenceCount: number }

const STAGES = [
  "Reading the plan…",
  "Collecting product photos…",
  "Composing the room…",
  "Lighting and shadows…"
];

export function RenderView({ room, detected, placed, products }: Props) {
  const [camera, setCamera] = useState<Camera>("dollhouse");
  const [shots, setShots] = useState<Partial<Record<Camera, Shot>>>({});
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [useProductPhotos, setUseProductPhotos] = useState(true);

  const current = shots[camera];

  async function render(cam: Camera = camera, force = false) {
    if (loading) return;
    if (shots[cam] && !force) { setCamera(cam); return; }

    setLoading(true);
    setError(null);
    setCamera(cam);
    setStage(0);
    const ticker = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4000);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, detected, placed, products, camera: cam, useProductPhotos })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "The render did not come back.");
        return;
      }
      setShots((prev) => ({ ...prev, [cam]: { image: json.image, camera: cam, referenceCount: json.referenceCount } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the renderer.");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/30 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ash">
          <Sparkles className="h-3.5 w-3.5 text-brass" />
          <span>Render</span>
          <span className="text-rule">/</span>
          <span>Built from your dimensions and the real listings</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ash">
            <input
              type="checkbox"
              checked={useProductPhotos}
              onChange={(e) => setUseProductPhotos(e.target.checked)}
              className="accent-brass"
            />
            Use product photos
          </label>
        </div>
      </div>

      {/* camera picker */}
      <div className="flex flex-wrap gap-1.5 border-b border-rule/30 px-4 py-3">
        {CAMERAS.map((c) => (
          <button
            key={c.key}
            onClick={() => render(c.key)}
            disabled={loading}
            title={c.blurb}
            className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-40 ${
              camera === c.key ? "border-brass text-brass" : "border-rule/40 text-ash hover:border-ash"
            }`}
          >
            {c.label}
            {shots[c.key] && <span className="ml-1.5 text-[9px] text-brass">●</span>}
          </button>
        ))}
      </div>

      <div className="relative aspect-[3/2] w-full overflow-hidden bg-[#0d0e10]">
        <AnimatePresence mode="wait">
          {current && !loading && (
            <motion.img
              key={current.image.slice(-24)}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              src={current.image}
              alt="Rendered room"
              className="h-full w-full object-cover"
            />
          )}
        </AnimatePresence>

        {loading && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-brass border-t-transparent animate-spin" />
              <motion.div key={stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 font-display text-2xl">
                {STAGES[stage]}
              </motion.div>
              <div className="mt-1 text-[11px] text-ash">This takes 15 to 30 seconds.</div>
            </div>
          </div>
        )}

        {!current && !loading && !error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <CameraIcon className="mx-auto h-7 w-7 text-brass" />
              <div className="mt-4 font-display text-3xl">See it for real.</div>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ash">
                Renders a photograph of this exact layout at this exact size, compositing the
                actual products from your shopping list.
              </p>
              <button onClick={() => render(camera)} className="btn btn-brass mt-6">
                <Sparkles className="h-3.5 w-3.5" /> Render this room
              </button>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-md">
              <AlertCircle className="mx-auto h-6 w-6 text-red-400" />
              <div className="mt-3 font-display text-2xl">The render failed.</div>
              <p className="mt-2 break-words text-[12px] leading-relaxed text-ash">{error}</p>
              <button onClick={() => render(camera, true)} className="btn btn-ghost mt-5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {current && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule/30 px-4 py-3">
          <div className="text-[11px] text-ash">
            {current.referenceCount > 0
              ? `Composited from ${current.referenceCount} of your actual product photos.`
              : "Generated from the plan description."}
            {" "}An interpretation, not a photograph of your room.
          </div>
          <div className="flex gap-2">
            <button onClick={() => render(camera, true)} disabled={loading} className="btn btn-ghost text-xs disabled:opacity-40">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
            </button>
            <a href={current.image} download={`sightline-${camera}.png`} className="btn btn-brass text-xs">
              <Download className="h-3.5 w-3.5" /> Save
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
