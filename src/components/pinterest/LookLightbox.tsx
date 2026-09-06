"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Loader2, X, ExternalLink } from "lucide-react";

import { stealLook } from "@/lib/vibe";
import { listRooms, saveStolenLook } from "@/lib/storage";
import type { RichVibe } from "@/lib/vibe";
import type { Category, Product, RoomType } from "@/lib/types";

export interface Pin {
  id: string;
  src: string;
  srcLarge?: string;
  alt: string;
  aspect: number;
  title: string;
  subtitle: string;
  photographer?: string;
}

/** The Pinterest tab has a bathroom; the layout engine does not. */
const ROOM_TYPE: Record<string, RoomType> = {
  any: "living",
  "living-room": "living",
  bedroom: "bedroom",
  bathroom: "living",
  office: "office"
};

const SOURCE_LABEL: Record<string, string> = {
  amazon: "Amazon",
  target: "Target",
  homedepot: "Home Depot",
  lowes: "Lowe's",
  wayfair: "Wayfair",
  ikea: "IKEA",
  westelm: "West Elm",
  cb2: "CB2",
  article: "Article",
  overstock: "Overstock",
  facebook: "Facebook",
  other: "Other"
};

/** 2.75 -> 33″ */
function inches(ft: number): number {
  return Math.round(ft * 12);
}

/**
 * The lightbox, and the shop.
 *
 * Opening a pin shows the picture. "Steal this Look" reads it — Gemini when
 * GOOGLE_AI_API_KEY is set, a local palette pass otherwise — and turns what it
 * finds into a live search across Amazon, Target, Home Depot, Wayfair, IKEA
 * and the rest. Reading is deliberate rather than automatic because each look
 * costs about a dozen SerpAPI searches.
 *
 * "Arrange in my room" then hands the chosen pieces to the canvas against a
 * real room: a saved one if there is one, otherwise dimensions typed here. It
 * never invents a room silently.
 */
export function LookLightbox({
  pin,
  room,
  liked,
  onToggleLike,
  onClose
}: {
  pin: Pin;
  room: string;
  liked: boolean;
  onToggleLike: () => void;
  onClose: () => void;
}) {
  const router = useRouter();

  const [vibe, setVibe] = useState<RichVibe | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [live, setLive] = useState(true);

  const rooms = useMemo(() => (typeof window === "undefined" ? [] : listRooms()), []);
  const [askDims, setAskDims] = useState(false);
  const [w, setW] = useState("12");
  const [d, setD] = useState("11");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chosen = (products || []).filter((p) => !dropped.has(p.id));

  async function shopThisLook() {
    if (loading) return;
    setLoading(true);
    setNote(null);
    try {
      const look = await stealLook(pin.srcLarge || pin.src);
      setVibe(look.vibe);

      const res = await fetch("/api/look", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room,
          searchTerms: look.vibe.searchTerms,
          styleTags: look.vibe.tags
        })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setNote("Could not reach the shops just now. Try again in a moment.");
        setProducts([]);
        return;
      }
      setProducts(data.products || []);
      setLive(data.live !== false);
      if (!data.products?.length) {
        setNote(data.notes?.[0] || "Nothing came back for this look.");
      } else if (data.live === false) {
        setNote("Showing the seed catalog — SERPAPI_KEY isn't reaching the server.");
      }
    } catch {
      setNote("Could not read this image. Try another pin.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  /** Hand the look and its pieces to the canvas, against a real room. */
  function arrange(widthFt: number, depthFt: number) {
    const categories = Array.from(new Set(chosen.map((p) => p.category))) as Category[];
    const brief = {
      roomType: ROOM_TYPE[room] || "living",
      goal: "refresh",
      budget: Math.max(250, chosen.reduce((s, p) => s + p.price, 0)),
      style: vibe?.styleLabel || "warm-minimal",
      mustHave: categories,
      widthFt,
      depthFt,
      vibeTags: vibe?.tags,
      vibePalette: vibe?.palette,
      searchTerms: vibe?.searchTerms,
      detected: {
        widthFt,
        depthFt,
        confidence: 0.6,
        openings: [],
        existing: [],
        palette: vibe?.palette || [],
        lightingNote: "From an inspiration image. Map your own room for exact measurements."
      },
      // The canvas prefers these over re-searching, so the pieces you picked
      // here are the pieces it lays out.
      lookProducts: chosen
    };
    try {
      sessionStorage.setItem("sightline:brief", JSON.stringify(brief));
    } catch {
      /* quota — the canvas will fall back to its own search */
    }
    router.push("/canvas");
  }

  /**
   * The original handoff: park the look and enter the capture flow at Brief,
   * for anyone who wants to photograph the real room and set budget and
   * must-haves before shopping rather than after.
   */
  function refineInCapture() {
    saveStolenLook({ pinImage: pin.srcLarge || pin.src, vibe });
    router.push("/capture");
  }

  function onArrangeClick() {
    if (rooms.length) {
      const r = rooms[0];
      arrange(r.spec.widthFt, r.spec.depthFt);
      return;
    }
    setAskDims(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(10,9,8,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden border border-rule bg-card md:flex-row ${
          products ? "max-w-[1040px]" : "max-w-[520px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center border border-white/40 bg-black/30 text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-ink"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ---------------------------------------------------- the picture */}
        <div className={`overflow-auto ${products ? "md:w-[46%] md:shrink-0" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.srcLarge || pin.src}
            alt={pin.alt}
            className="block w-full object-cover md:h-full"
            style={products ? undefined : { aspectRatio: `1 / ${pin.aspect}` }}
          />
        </div>

        {/* ------------------------------------------------------- the shop */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-rule p-5">
            <h2 className="display-lg text-[22px]">{pin.title}</h2>
            <p className="eyebrow mt-1.5">{pin.subtitle}</p>

            {vibe && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {vibe.palette?.slice(0, 5).map((c) => (
                  <span
                    key={c}
                    className="h-5 w-5 border border-rule"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
                {(vibe.styleLabel ? [vibe.styleLabel, ...(vibe.tags || [])] : vibe.tags || [])
                  .slice(0, 4)
                  .map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={onToggleLike}
                aria-pressed={liked}
                className={`btn px-5 py-2.5 ${liked ? "btn-primary" : "btn-light"}`}
              >
                <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} />
                {liked ? "Liked" : "Like"}
              </button>

              {!products && (
                <button onClick={shopThisLook} disabled={loading} className="btn btn-light px-5 py-2.5 disabled:opacity-70">
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? "Reading the look…" : "Steal this Look"}
                </button>
              )}
            </div>
          </div>

          {/* results */}
          {products && (
            <div className="min-h-0 flex-1 overflow-auto">
              {note && <p className="eyebrow border-b border-rule px-5 py-3">{note}</p>}

              {products.length > 0 && (
                <p className="eyebrow border-b border-rule px-5 py-3">
                  {chosen.length} of {products.length} pieces{live ? "" : " · seed catalog"}
                </p>
              )}

              <ul>
                {products.map((p) => {
                  const off = dropped.has(p.id);
                  const estimated = p.dimensionsVerified === false;
                  return (
                    <li key={p.id} className={`flex gap-3 border-b border-rule/60 p-4 transition-opacity ${off ? "opacity-40" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.title} className="h-20 w-20 shrink-0 border border-rule object-cover" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <p className="wordmark truncate text-[14px] text-ink">{p.title}</p>
                        <p className="eyebrow mt-1">
                          ${p.price} · {SOURCE_LABEL[p.source] || p.source}
                        </p>
                        <p className="eyebrow mt-1 text-[10px]">
                          {inches(p.width)}″W × {inches(p.depth)}″D × {inches(p.height)}″H
                          {estimated && " · est."}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-link inline-flex items-center gap-1 text-[10px] text-ash hover:text-ink"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={() =>
                              setDropped((prev) => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                                return next;
                              })
                            }
                            className="nav-link text-[10px] text-ash hover:text-ink"
                          >
                            {off ? "Add back" : "Remove"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* arrange */}
          {products && products.length > 0 && (
            <div className="border-t border-rule p-5">
              {askDims ? (
                <div>
                  <p className="eyebrow">How big is the room?</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="eyebrow flex items-center gap-2">
                      Width
                      <input
                        value={w}
                        onChange={(e) => setW(e.target.value)}
                        inputMode="decimal"
                        aria-label="Room width in feet"
                        className="wordmark w-16 border border-ink bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none"
                      />
                      ft
                    </label>
                    <label className="eyebrow flex items-center gap-2">
                      Depth
                      <input
                        value={d}
                        onChange={(e) => setD(e.target.value)}
                        inputMode="decimal"
                        aria-label="Room depth in feet"
                        className="wordmark w-16 border border-ink bg-transparent px-2 py-1.5 text-[14px] text-ink outline-none"
                      />
                      ft
                    </label>
                    <button
                      onClick={() => {
                        const wf = clamp(parseFloat(w), 4, 60);
                        const df = clamp(parseFloat(d), 4, 60);
                        arrange(wf, df);
                      }}
                      className="btn btn-primary px-5 py-2.5"
                    >
                      Arrange
                    </button>
                  </div>
                  <p className="eyebrow mt-3 text-[10px]">
                    Or map it properly from Capture for exact measurements.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={onArrangeClick}
                      disabled={!chosen.length}
                      className="btn btn-primary px-5 py-2.5 disabled:opacity-40"
                    >
                      Arrange in my room
                    </button>
                    <button onClick={refineInCapture} className="nav-link text-[10px] text-ash hover:text-ink">
                      Refine in Capture
                    </button>
                  </div>
                  <span className="eyebrow text-[10px]">
                    {rooms.length ? `Into “${rooms[0].name}”` : "We'll ask for the size"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
