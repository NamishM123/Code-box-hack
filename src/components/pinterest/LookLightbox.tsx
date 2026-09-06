"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Heart, Loader2, X, ExternalLink } from "lucide-react";

import { stealLook } from "@/lib/vibe";
import { listRooms, saveStolenLook } from "@/lib/storage";
import type { RichVibe } from "@/lib/vibe";
import type { Category, DetectedRoom, Product, RoomType } from "@/lib/types";

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

interface LookGroup {
  category: Category;
  label: string;
  query: string;
  options: Product[];
  /** Where this piece stood in the picture's own plan. */
  x?: number;
  y?: number;
  backsTo?: "N" | "E" | "S" | "W" | "none";
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
const inches = (ft: number) => Math.round(ft * 12);

/**
 * The lightbox, and the shop.
 *
 * "Steal this Look" reads the picture, counts the pieces actually in it, and
 * offers two options for each — a bed section, a lamp section, and nothing for
 * furniture the photo doesn't contain. One option per piece is chosen, so the
 * room that gets built has the same number of things in it as the photograph
 * rather than two dozen.
 *
 * Reading is a deliberate click because each look costs a handful of SerpAPI
 * searches.
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
  const [groups, setGroups] = useState<LookGroup[] | null>(null);
  /** category -> chosen product id. One per piece, first option by default. */
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const rooms = useMemo(() => (typeof window === "undefined" ? [] : listRooms()), []);
  const [askDims, setAskDims] = useState(false);
  const [w, setW] = useState("12");
  const [d, setD] = useState("11");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Exactly one product per piece the picture contains. */
  const live = useMemo(() => {
    const out: { product: Product; group: LookGroup }[] = [];
    for (const g of groups || []) {
      if (skipped.has(key(g))) continue;
      const product = g.options.find((o) => o.id === picked[key(g)]) || g.options[0];
      if (product) out.push({ product, group: g });
    }
    return out;
  }, [groups, picked, skipped]);

  const chosen = useMemo(() => live.map((l) => l.product), [live]);

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
          items: look.vibe.items,
          styleWords: [look.vibe.styleLabel, ...(look.vibe.tags || [])].filter(Boolean)
        })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setNote("Could not reach the shops just now. Try again in a moment.");
        setGroups([]);
        return;
      }

      const gs: LookGroup[] = data.groups || [];
      setGroups(gs);
      setPicked(Object.fromEntries(gs.map((g) => [key(g), g.options[0]?.id]).filter(([, v]) => v)));

      if (!gs.length) setNote(data.notes?.[0] || "Nothing came back for this look.");
      else if (data.live === false) setNote("Showing the seed catalog — SERPAPI_KEY isn't reaching the server.");
      else if (!look.vibe.items?.length) setNote("Couldn't read the picture in detail, so these are a best guess.");
    } catch {
      setNote("Could not read this image. Try another pin.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  /** Hand the chosen pieces to the canvas, in a room shaped like the picture. */
  function arrange(widthFt: number, depthFt: number) {
    const categories = Array.from(new Set(chosen.map((p) => p.category))) as Category[];

    // The picture's own openings only make sense at the picture's own scale.
    // Once the reader supplies their real room we keep the proportions but
    // drop the openings rather than inventing windows in their wall.
    const sameShape =
      vibe?.widthFt != null &&
      vibe?.depthFt != null &&
      Math.abs(widthFt / depthFt - vibe.widthFt / vibe.depthFt) < 0.08;

    const detected: DetectedRoom = {
      widthFt,
      depthFt,
      confidence: 0.6,
      openings: sameShape ? (vibe?.openings ?? []) : [],
      existing: [],
      palette: vibe?.palette || [],
      lightingNote: sameShape
        ? "Room shell read from the inspiration image."
        : "Proportions from the inspiration image. Map your own room from Capture for exact measurements."
    };

    // The photograph's arrangement, tied to the products actually chosen. The
    // layout engine scales it into this room and re-checks every position, so
    // a copied plan still can't produce a fit verdict that isn't real.
    const placed = live.filter((l) => l.group.x != null && l.group.y != null);
    const lookPlan = placed.length
      ? {
          refW: vibe?.widthFt ?? widthFt,
          refD: vibe?.depthFt ?? depthFt,
          items: placed.map((l) => ({
            productId: l.product.id,
            x: l.group.x as number,
            y: l.group.y as number,
            backsTo: l.group.backsTo
          }))
        }
      : undefined;

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
      detected,
      lookProducts: chosen,
      lookPlan
    };

    try {
      sessionStorage.setItem("sightline:brief", JSON.stringify(brief));
    } catch {
      /* quota — the canvas falls back to its own search */
    }
    router.push("/canvas");
  }

  /**
   * The original handoff: park the look and enter the capture flow at Brief,
   * for anyone who wants to photograph the real room first.
   */
  function refineInCapture() {
    saveStolenLook({ pinImage: pin.srcLarge || pin.src, vibe });
    router.push("/capture");
  }

  function onArrangeClick() {
    if (rooms.length) {
      arrange(rooms[0].spec.widthFt, rooms[0].spec.depthFt);
      return;
    }
    // Default the inputs to the picture's own proportions.
    if (vibe?.widthFt && vibe?.depthFt) {
      setW(String(Math.round(vibe.widthFt)));
      setD(String(Math.round(vibe.depthFt)));
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
        /* Two panes only once there is a shop to put in the second one. Before
           that it is one column, picture over actions — a row would give the
           picture the whole width and leave the actions nothing. */
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden border border-rule bg-card ${
          groups ? "max-w-[1080px] md:flex-row" : "max-w-[520px]"
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
        {/* Capped before the shop exists, so a tall portrait pin can't push the
            actions below the fold and read as "the image just opened". */}
        <div
          className={
            groups
              ? "overflow-hidden md:w-[42%] md:shrink-0"
              : "max-h-[52vh] shrink overflow-hidden"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.srcLarge || pin.src}
            alt={pin.alt}
            className="block h-full w-full object-cover"
          />
        </div>

        {/* ------------------------------------------------------- the shop */}
        <div className="flex min-h-0 min-w-0 flex-1 shrink-0 flex-col">
          <div className="border-b border-rule p-5">
            <h2 className="display-lg text-[20px]">{pin.title}</h2>
            <p className="eyebrow mt-1.5">{pin.subtitle}</p>

            {vibe && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {vibe.palette?.slice(0, 5).map((c) => (
                  <span key={c} className="h-5 w-5 border border-rule" style={{ background: c }} title={c} />
                ))}
                {(vibe.styleLabel ? [vibe.styleLabel, ...(vibe.tags || [])] : vibe.tags || [])
                  .slice(0, 3)
                  .map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={onToggleLike}
                aria-pressed={liked}
                className="btn btn-light px-5 py-2.5"
              >
                <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} />
                {liked ? "Liked" : "Like"}
              </button>

              {!groups && (
                <button onClick={shopThisLook} disabled={loading} className="btn btn-primary px-6 py-2.5 disabled:opacity-70">
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {loading ? "Reading the picture…" : "Steal this Look"}
                </button>
              )}
            </div>

            {!groups && (
              <p className="eyebrow mt-3 text-[10px]">
                {loading
                  ? "Finding two options for every piece in this picture."
                  : "Shows two options for each piece of furniture in this picture."}
              </p>
            )}
          </div>

          {/* one section per piece in the picture */}
          {groups && (
            <div className="min-h-0 flex-1 overflow-auto">
              {note && <p className="eyebrow border-b border-rule px-5 py-3">{note}</p>}

              {groups.length > 0 && (
                <p className="eyebrow border-b border-rule px-5 py-3">
                  {groups.length} {groups.length === 1 ? "piece" : "pieces"} in this picture · {chosen.length} chosen
                </p>
              )}

              {groups.map((g) => {
                const off = skipped.has(key(g));
                return (
                  <section key={key(g)} className={`border-b border-rule/60 p-5 ${off ? "opacity-40" : ""}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="eyebrow text-ink">{g.category}</h3>
                      <button
                        onClick={() =>
                          setSkipped((prev) => {
                            const next = new Set(prev);
                            if (next.has(key(g))) next.delete(key(g));
                            else next.add(key(g));
                            return next;
                          })
                        }
                        className="nav-link text-[10px] text-ash hover:text-ink"
                      >
                        {off ? "Put back" : "Skip"}
                      </button>
                    </div>
                    <p className="caption mt-1.5 text-[11px] normal-case tracking-[0.06em]">
                      {g.label}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {g.options.map((p) => {
                        const on = !off && (picked[key(g)] || g.options[0]?.id) === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPicked((prev) => ({ ...prev, [key(g)]: p.id }))}
                            aria-pressed={on}
                            className={`relative flex flex-col border p-2 text-left transition-colors duration-300 ${
                              on ? "border-ink" : "border-rule hover:border-ash"
                            }`}
                          >
                            {on && (
                              <span className="absolute right-2 top-2 z-10 grid h-5 w-5 place-items-center bg-ink text-paper">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.image} alt={p.title} className="mb-2 h-24 w-full border border-rule object-cover" loading="lazy" />
                            <span className="wordmark line-clamp-2 text-[12px] leading-snug text-ink">{p.title}</span>
                            <span className="eyebrow mt-1 text-[10px]">
                              ${p.price} · {SOURCE_LABEL[p.source] || p.source}
                            </span>
                            <span className="eyebrow mt-0.5 text-[9px]">
                              {inches(p.width)}″ × {inches(p.depth)}″ × {inches(p.height)}″
                              {p.dimensionsVerified === false && " · est."}
                            </span>
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="nav-link mt-1.5 inline-flex items-center gap-1 text-[9px] text-ash hover:text-ink"
                            >
                              View <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* arrange */}
          {groups && groups.length > 0 && (
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
                      onClick={() => arrange(clamp(parseFloat(w), 4, 60), clamp(parseFloat(d), 4, 60))}
                      className="btn btn-primary px-5 py-2.5"
                    >
                      Arrange
                    </button>
                  </div>
                  {vibe?.widthFt && vibe?.depthFt && (
                    <p className="eyebrow mt-3 text-[10px]">
                      The picture looks about {Math.round(vibe.widthFt)}′ × {Math.round(vibe.depthFt)}′.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={onArrangeClick}
                      disabled={!chosen.length}
                      className="btn btn-primary px-5 py-2.5 disabled:opacity-40"
                    >
                      Arrange {chosen.length} {chosen.length === 1 ? "piece" : "pieces"}
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

/** Two nightstands are two groups, so the category alone can't be the key. */
function key(g: LookGroup): string {
  return `${g.category}|${g.query}`;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
